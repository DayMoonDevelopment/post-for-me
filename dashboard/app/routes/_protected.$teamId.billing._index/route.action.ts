import { redirect } from "react-router";
import { z } from "zod";
import type Stripe from "stripe";

import { stripe } from "~/lib/.server/stripe";
import { withSupabase } from "~/lib/.server/supabase";
import {
  STRIPE_API_PRODUCT_ID,
  STRIPE_CREDS_ADDON_PRODUCT_ID,
  STRIPE_CANCELLED_STATUSES,
} from "~/lib/.server/stripe.constants";
import { getSubscriptionPlanInfo } from "~/lib/.server/get-subscription-plan-info";
import { resolveTargetTier } from "~/lib/.server/pricing-tiers";
import {
  SCHEDULE_METADATA_KEY,
  SCHEDULE_TYPE,
  releaseSchedulesForCustomer,
  findScheduleOfType,
} from "~/lib/.server/subscription-schedules";

type BillingTeam = {
  id: string;
  name: string;
  stripe_customer_id: string | null;
  billing_email: string | null;
};

type ActionDeps = {
  request: Request;
  teamId: string;
  currentUserId: string;
  team: BillingTeam;
  formData: FormData;
};

export const action = withSupabase(async ({ supabase, params, request }) => {
  const { teamId } = params;

  if (!teamId) {
    throw new Error("Team code is required");
  }

  const currentUser = await supabase.auth.getUser();

  if (!currentUser.data?.user) {
    throw new Error("User not found");
  }

  const team = await supabase
    .from("teams")
    .select("id, name, stripe_customer_id, billing_email")
    .eq("id", teamId)
    .single();

  if (team.error) {
    return new Response("Team not found", {
      status: 404,
    });
  }

  const formData = await request.formData();
  const action = formData.get("action");

  const deps: ActionDeps = {
    request,
    teamId,
    currentUserId: currentUser.data.user.id,
    team: team.data,
    formData,
  };

  switch (action) {
    case "upgrade_from_legacy":
      return handleUpgradeFromLegacy(deps);
    case "create_checkout":
      return handleCreateCheckout(deps);
    default:
      return handleAddonActions(deps);
  }
});

// Helper functions
function getDefaultPriceId(product: Stripe.Product): string {
  const defaultPrice = product.default_price;

  if (!defaultPrice) {
    throw new Error("Stripe product has no default price");
  }

  if (typeof defaultPrice === "string") {
    return defaultPrice;
  }

  return defaultPrice.id;
}

async function handleUpgradeFromLegacy({
  request,
  teamId,
  currentUserId,
  team,
  formData,
}: ActionDeps) {
  if (!team.stripe_customer_id) {
    return new Response("No billing setup found", { status: 400 });
  }

  const upgradeActionSchema = z.object({
    action: z.literal("upgrade_from_legacy"),
    tierIndex: z.string(),
  });

  const upgradeResult = upgradeActionSchema.safeParse({
    action: formData.get("action"),
    tierIndex: formData.get("tierIndex"),
  });

  if (!upgradeResult.success) {
    return new Response("Invalid upgrade action", { status: 400 });
  }

  try {
    // Get the most recent subscription regardless of status
    const subscriptions = await stripe.subscriptions.list({
      customer: team.stripe_customer_id,
      status: "all",
      limit: 1,
      expand: ["data.items.data.price"],
    });

    const subscription = subscriptions.data[0];

    if (
      !subscription ||
      subscription.status === "canceled" ||
      subscription.status === "unpaid"
    ) {
      return new Response("No manageable subscription found", {
        status: 400,
      });
    }

    // Check for the legacy item directly rather than relying on
    // planInfo.isLegacy — getSubscriptionPlanInfo checks new-pricing-tier
    // items first, so it reports isLegacy:false even when a legacy item
    // still exists alongside one (e.g. a partially-failed prior migration).
    const legacyApiItem = subscription.items.data.find(
      (item) => item.price.product === STRIPE_API_PRODUCT_ID,
    );

    if (!legacyApiItem) {
      return new Response("Team is not on a legacy plan", { status: 400 });
    }

    const planInfo = getSubscriptionPlanInfo(subscription);

    const resolution = resolveTargetTier({
      tierIndexRaw: upgradeResult.data.tierIndex,
      planInfo,
    });

    if (!resolution.ok) {
      return new Response(resolution.error, { status: 400 });
    }

    const selectedTier = resolution.tier;

    const addonItem = subscription.items.data.find(
      (item) => item.price.product === STRIPE_CREDS_ADDON_PRODUCT_ID,
    );

    // Get the new product
    const newProduct = await stripe.products.retrieve(selectedTier.productId);

    // Remove any active subscription schedules first — migrating off the
    // legacy plan replaces the subscription's line items wholesale, so any
    // pending schedule (of any type) is stale afterward.
    await releaseSchedulesForCustomer({
      stripeCustomerId: team.stripe_customer_id,
      criteria: { mode: "all" },
    });

    // Update the subscription: remove legacy items and add new plan
    const itemsToRemove = [legacyApiItem.id];
    if (addonItem) {
      itemsToRemove.push(addonItem.id);
    }

    await stripe.subscriptions.update(subscription.id, {
      items: [
        // Remove legacy product and addon
        ...itemsToRemove.map((id) => ({ id, deleted: true })),
        // Add new pricing tier product
        {
          price: getDefaultPriceId(newProduct),
          quantity: 1,
        },
      ],
      proration_behavior: "always_invoice",
      metadata: {
        ...subscription.metadata,
        upgraded_from_legacy: new Date().toISOString(),
        upgraded_by: currentUserId,
      },
    });

    const redirectUrl = new URL(`/${teamId}/billing`, request.url);
    redirectUrl.searchParams.set("toast_type", "success");
    redirectUrl.searchParams.set(
      "toast",
      `Successfully upgraded to Pro plan with ${selectedTier.posts.toLocaleString()} posts/month`,
    );

    return redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Error upgrading from legacy plan:", error);

    const redirectUrl = new URL(`/${teamId}/billing`, request.url);
    redirectUrl.searchParams.set("toast_type", "error");
    redirectUrl.searchParams.set(
      "toast",
      "Failed to upgrade subscription. Please try again.",
    );

    return redirect(redirectUrl.toString());
  }
}

async function handleCreateCheckout({
  request,
  teamId,
  currentUserId,
  team,
  formData,
}: ActionDeps) {
  const checkoutActionSchema = z.object({
    action: z.literal("create_checkout"),
    tierIndex: z.string(),
  });

  const checkoutResult = checkoutActionSchema.safeParse({
    action: formData.get("action"),
    tierIndex: formData.get("tierIndex"),
  });

  if (!checkoutResult.success) {
    return new Response("Invalid checkout action", { status: 400 });
  }

  const subscriptions = team.stripe_customer_id
    ? await stripe.subscriptions.list({
        customer: team.stripe_customer_id,
        status: "all",
        limit: 1,
        expand: ["data.items.data.price"],
      })
    : null;

  const existingSubscription = subscriptions?.data[0] ?? null;

  if (
    existingSubscription &&
    !STRIPE_CANCELLED_STATUSES.includes(existingSubscription.status)
  ) {
    return new Response("You already have an active subscription", {
      status: 400,
    });
  }

  // A canceled/unpaid existingSubscription is allowed through above, but its
  // plan info shouldn't gate this as an "upgrade" — it's a fresh checkout.
  const planInfo = getSubscriptionPlanInfo(
    existingSubscription &&
      !STRIPE_CANCELLED_STATUSES.includes(existingSubscription.status)
      ? existingSubscription
      : null,
  );

  const resolution = resolveTargetTier({
    tierIndexRaw: checkoutResult.data.tierIndex,
    planInfo,
  });

  if (!resolution.ok) {
    return new Response(resolution.error, { status: 400 });
  }

  const selectedTier = resolution.tier;

  const product = await stripe.products.retrieve(selectedTier.productId);
  const teamDashboardUrl = new URL(
    `/${teamId}/billing`,
    request.url,
  ).toString();

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: team.stripe_customer_id || undefined,
      customer_email: team.stripe_customer_id
        ? undefined
        : team.billing_email || undefined,
      allow_promotion_codes: true,
      mode: "subscription",
      line_items: [
        {
          price: getDefaultPriceId(product),
          quantity: 1,
        },
      ],
      client_reference_id: teamId,
      metadata: {
        team_id: teamId,
        team_name: team.name,
        created_by: currentUserId,
      },
      success_url: new URL(
        `/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
        request.url,
      ).toString(),
      cancel_url: teamDashboardUrl,
    });

    return redirect(checkoutSession.url!);
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response("Failed to create checkout session", {
      status: 500,
    });
  }
}

async function handleAddonActions({
  request,
  teamId,
  team,
  formData,
}: Omit<ActionDeps, "currentUserId">) {
  if (!team.stripe_customer_id) {
    return new Response("No billing setup found", { status: 400 });
  }

  const addonActionSchema = z.object({
    action: z.enum(["add_addon", "remove_addon"]),
  });

  const result = addonActionSchema.safeParse({
    action: formData.get("action"),
  });

  if (!result.success) {
    return new Response("Invalid action", { status: 400 });
  }

  const { action: actionType } = result.data;

  try {
    // Get the most recent subscription regardless of status
    const subscriptions = await stripe.subscriptions.list({
      customer: team.stripe_customer_id,
      status: "all",
      limit: 1,
      expand: ["data.items.data.price"],
    });

    const subscription: Stripe.Subscription | undefined = subscriptions.data[0];

    if (
      !subscription ||
      subscription.status === "canceled" ||
      subscription.status === "unpaid"
    ) {
      return new Response("No manageable subscription found", {
        status: 400,
      });
    }

    // Get the addon product
    const addonProduct = await stripe.products.retrieve(
      STRIPE_CREDS_ADDON_PRODUCT_ID,
    );
    const mainProduct = await stripe.products.retrieve(STRIPE_API_PRODUCT_ID);

    const mainDefaultPriceId = getDefaultPriceId(mainProduct);

    switch (actionType) {
      case "add_addon": {
        // Check if addon is already present
        const hasAddon = subscription.items.data.some(
          (item) => item.price.product === STRIPE_CREDS_ADDON_PRODUCT_ID,
        );

        if (hasAddon) {
          // Cancel a pending addon-removal schedule only — don't touch an
          // unrelated active schedule (e.g. a usage-based auto-upgrade).
          await releaseSchedulesForCustomer({
            stripeCustomerId: team.stripe_customer_id,
            criteria: { mode: "matching", type: SCHEDULE_TYPE.ADDON_REMOVAL },
          });
          break;
        }

        await stripe.subscriptionItems.create({
          subscription: subscription.id,
          price: getDefaultPriceId(addonProduct),
          proration_behavior: "always_invoice",
        });

        break;
      }
      case "remove_addon": {
        const addonItem = subscription.items.data.find(
          (item) => item.price.product === STRIPE_CREDS_ADDON_PRODUCT_ID,
        );

        if (!addonItem) {
          return new Response("Addon not found", { status: 400 });
        }

        const schedules = await stripe.subscriptionSchedules.list({
          customer: team.stripe_customer_id,
        });

        const activeSchedules = schedules.data.filter(
          (s) => s.status === "active",
        );

        const existingRemovalSchedule = findScheduleOfType(
          activeSchedules,
          SCHEDULE_TYPE.ADDON_REMOVAL,
        );

        if (!existingRemovalSchedule) {
          // Stripe only allows one active schedule per subscription — release
          // any other active schedule (e.g. a usage-based-upgrade schedule)
          // so the create() below doesn't fail.
          for (const conflicting of activeSchedules) {
            console.warn("Releasing conflicting subscription schedule", {
              schedule_id: conflicting.id,
              schedule_type:
                conflicting.metadata?.[SCHEDULE_METADATA_KEY] ?? null,
              subscription_id: subscription.id,
              stripe_customer_id: team.stripe_customer_id,
            });
          }

          await releaseSchedulesForCustomer({
            stripeCustomerId: team.stripe_customer_id,
            criteria: { mode: "excluding", type: SCHEDULE_TYPE.ADDON_REMOVAL },
          });
        }

        const schedule =
          existingRemovalSchedule ??
          (await stripe.subscriptionSchedules.create({
            from_subscription: subscription.id,
            metadata: { [SCHEDULE_METADATA_KEY]: SCHEDULE_TYPE.ADDON_REMOVAL },
          }));

        await stripe.subscriptionSchedules.update(schedule.id, {
          end_behavior: "release",
          phases: [
            {
              start_date: schedule.phases[0].start_date,
              items: [
                {
                  price: mainDefaultPriceId,
                },
                {
                  price: addonItem.price.id,
                  quantity: 1,
                },
              ],
              proration_behavior: "none",
              end_date: addonItem.current_period_end,
            },
            {
              start_date: addonItem.current_period_end,
              items: [
                {
                  price: mainDefaultPriceId,
                },
              ],
              proration_behavior: "none",
            },
          ],
        });

        break;
      }
    }

    const redirectUrl = new URL(`/${teamId}/billing`, request.url);
    redirectUrl.searchParams.set("toast_type", "success");
    redirectUrl.searchParams.set(
      "toast",
      actionType === "add_addon"
        ? "Quickstart Project addon added successfully"
        : "Quickstart Project addon removed successfully",
    );

    return redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Error managing addon:", error);

    const redirectUrl = new URL(`/${teamId}/billing`, request.url);
    redirectUrl.searchParams.set("toast_type", "error");
    redirectUrl.searchParams.set(
      "toast",
      "Failed to update addon. Please try again.",
    );

    return redirect(redirectUrl.toString());
  }
}

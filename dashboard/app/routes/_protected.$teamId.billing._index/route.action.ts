import { redirect } from "react-router";
import { z } from "zod";
import type Stripe from "stripe";

import { stripe } from "~/lib/.server/stripe";
import { withSupabase } from "~/lib/.server/supabase";
import {
  STRIPE_API_PRODUCT_ID,
  STRIPE_CREDS_ADDON_PRODUCT_ID,
  PRICING_TIERS,
} from "~/lib/.server/stripe.constants";

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
    case "schedule_cancel":
      return handleScheduleCancel(deps);
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

  const tierIndex = parseInt(upgradeResult.data.tierIndex);
  const selectedTier = PRICING_TIERS[tierIndex];

  if (!selectedTier) {
    return new Response("Invalid tier selected", { status: 400 });
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

    // Find the legacy API product item and addon item
    const legacyApiItem = subscription.items.data.find(
      (item) => item.price.product === STRIPE_API_PRODUCT_ID,
    );

    const addonItem = subscription.items.data.find(
      (item) => item.price.product === STRIPE_CREDS_ADDON_PRODUCT_ID,
    );

    if (!legacyApiItem) {
      return new Response("No legacy subscription item found", {
        status: 400,
      });
    }

    // Get the new product
    const newProduct = await stripe.products.retrieve(selectedTier.productId);

    // Remove any active subscription schedules first
    const schedules = await stripe.subscriptionSchedules.list({
      customer: team.stripe_customer_id,
    });

    for (const schedule of schedules.data.filter(
      (s) => s.status === "active",
    )) {
      await stripe.subscriptionSchedules.release(schedule.id);
    }

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

async function handleScheduleCancel({
  request,
  teamId,
  currentUserId,
  team,
  formData,
}: ActionDeps) {
  if (!team.stripe_customer_id) {
    return new Response("No billing setup found", { status: 400 });
  }

  const cancelActionSchema = z.object({
    action: z.literal("schedule_cancel"),
  });

  const cancelResult = cancelActionSchema.safeParse({
    action: formData.get("action"),
  });

  if (!cancelResult.success) {
    return new Response("Invalid cancel action", { status: 400 });
  }

  try {
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

    // Already canceling; treat as success.
    if (subscription.cancel_at_period_end || subscription.cancel_at) {
      const redirectUrl = new URL(`/${teamId}/billing`, request.url);
      redirectUrl.searchParams.set("toast_type", "success");
      redirectUrl.searchParams.set(
        "toast",
        "Cancellation is already scheduled for the end of the billing period.",
      );
      return redirect(redirectUrl.toString());
    }

    const schedules = await stripe.subscriptionSchedules.list({
      customer: team.stripe_customer_id,
    });

    const schedule =
      schedules.data.find((s) => s.status === "active") ||
      (await stripe.subscriptionSchedules.create({
        from_subscription: subscription.id,
      }));

    const scheduleItems = subscription.items.data.map((item) => ({
      price: item.price.id,
      quantity: item.quantity ?? 1,
    }));

    const itemPeriodEnds = subscription.items.data
      .map((item) => item.current_period_end)
      .filter((end): end is number => typeof end === "number");

    const periodEnd = itemPeriodEnds.length
      ? Math.min(...itemPeriodEnds)
      : undefined;

    if (!periodEnd) {
      return new Response("Unable to determine billing period end", {
        status: 500,
      });
    }

    const updatedSchedule = await stripe.subscriptionSchedules.update(
      schedule.id,
      {
        end_behavior: "cancel",
        phases: [
          {
            start_date: schedule.phases[0].start_date,
            end_date: periodEnd,
            items: scheduleItems,
            proration_behavior: "none",
          },
        ],
        metadata: {
          ...schedule.metadata,
          cancel_scheduled_by: currentUserId,
          cancel_scheduled_at: new Date().toISOString(),
        },
      },
    );

    const endDate = updatedSchedule.phases?.[0]?.end_date
      ? new Date(updatedSchedule.phases[0].end_date * 1000).toLocaleDateString()
      : periodEnd
        ? new Date(periodEnd * 1000).toLocaleDateString()
        : "end of the billing period";

    const redirectUrl = new URL(`/${teamId}/billing`, request.url);
    redirectUrl.searchParams.set("toast_type", "success");
    redirectUrl.searchParams.set(
      "toast",
      `Subscription cancellation scheduled for ${endDate}.`,
    );

    return redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Error scheduling cancellation:", error);

    const redirectUrl = new URL(`/${teamId}/billing`, request.url);
    redirectUrl.searchParams.set("toast_type", "error");
    redirectUrl.searchParams.set(
      "toast",
      "Failed to schedule cancellation. Please try again.",
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

  const tierIndex = parseInt(checkoutResult.data.tierIndex);
  const selectedTier = PRICING_TIERS[tierIndex];

  if (!selectedTier) {
    return new Response("Invalid tier selected", { status: 400 });
  }

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
          const schedules = await stripe.subscriptionSchedules.list({
            customer: team.stripe_customer_id,
          });

          for (const schedule of schedules.data.filter(
            (s) => s.status === "active",
          )) {
            await stripe.subscriptionSchedules.release(schedule.id);
          }
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

        const schedule =
          schedules.data.filter((s) => s.status === "active").length > 0
            ? schedules.data[0]
            : await stripe.subscriptionSchedules.create({
                from_subscription: subscription.id,
              });

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

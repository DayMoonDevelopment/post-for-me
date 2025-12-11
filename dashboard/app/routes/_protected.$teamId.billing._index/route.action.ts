import { redirect } from "react-router";
import { z } from "zod";

import { stripe } from "~/lib/.server/stripe";
import { withSupabase } from "~/lib/.server/supabase";
import {
  STRIPE_API_PRODUCT_ID,
  STRIPE_CREDS_ADDON_PRODUCT_ID,
  PRICING_TIERS,
} from "~/lib/.server/stripe.constants";

const addonActionSchema = z.object({
  action: z.enum(["add_addon", "remove_addon"]),
});

const checkoutActionSchema = z.object({
  action: z.literal("create_checkout"),
  tierIndex: z.string(),
});

const upgradeActionSchema = z.object({
  action: z.literal("upgrade_from_legacy"),
  tierIndex: z.string(),
});

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

  // Handle upgrade from legacy plan
  if (action === "upgrade_from_legacy") {
    if (!team.data.stripe_customer_id) {
      return new Response("No billing setup found", { status: 400 });
    }

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
      // Get the active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: team.data.stripe_customer_id,
        status: "active",
        expand: ["data.items.data.price"],
      });

      const subscription = subscriptions.data[0];

      if (!subscription) {
        return new Response("No active subscription found", { status: 400 });
      }

      // Find the legacy API product item and addon item
      const legacyApiItem = subscription.items.data.find(
        (item) => item.price.product === STRIPE_API_PRODUCT_ID
      );

      const addonItem = subscription.items.data.find(
        (item) => item.price.product === STRIPE_CREDS_ADDON_PRODUCT_ID
      );

      if (!legacyApiItem) {
        return new Response("No legacy subscription item found", { status: 400 });
      }

      // Get the new product
      const newProduct = await stripe.products.retrieve(selectedTier.productId);

      // Remove any active subscription schedules first
      const schedules = await stripe.subscriptionSchedules.list({
        customer: team.data.stripe_customer_id,
      });

      for (const schedule of schedules.data.filter(
        (s) => s.status === "active"
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
            price: newProduct.default_price as string,
            quantity: 1,
          },
        ],
        proration_behavior: "always_invoice",
        metadata: {
          ...subscription.metadata,
          upgraded_from_legacy: new Date().toISOString(),
          upgraded_by: currentUser.data.user.id,
        },
      });

      const redirectUrl = new URL(`/${teamId}/billing`, request.url);
      redirectUrl.searchParams.set("toast_type", "success");
      redirectUrl.searchParams.set(
        "toast",
        `Successfully upgraded to Pro plan with ${selectedTier.posts.toLocaleString()} posts/month`
      );

      return redirect(redirectUrl.toString());
    } catch (error) {
      console.error("Error upgrading from legacy plan:", error);

      const redirectUrl = new URL(`/${teamId}/billing`, request.url);
      redirectUrl.searchParams.set("toast_type", "error");
      redirectUrl.searchParams.set(
        "toast",
        "Failed to upgrade subscription. Please try again."
      );

      return redirect(redirectUrl.toString());
    }
  }

  // Handle checkout creation
  if (action === "create_checkout") {
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
    const teamDashboardUrl = new URL(`/${teamId}/billing`, request.url).toString();

    try {
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: team.data.stripe_customer_id || undefined,
        customer_email: team.data.stripe_customer_id ? undefined : team.data.billing_email || undefined,
        mode: "subscription",
        line_items: [
          {
            price: product.default_price as string,
            quantity: 1,
          },
        ],
        client_reference_id: teamId,
        metadata: {
          team_id: teamId,
          team_name: team.data.name,
          created_by: currentUser.data.user.id,
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
      return new Response("Failed to create checkout session", { status: 500 });
    }
  }

  // Handle addon actions
  if (!team.data.stripe_customer_id) {
    return new Response("No billing setup found", { status: 400 });
  }

  const result = addonActionSchema.safeParse({
    action: formData.get("action"),
  });

  if (!result.success) {
    return new Response("Invalid action", { status: 400 });
  }

  const { action: actionType } = result.data;

  try {
    // Get the active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: team.data.stripe_customer_id,
      status: "active",
      expand: ["data.items.data.price"],
    });

    const subscription = subscriptions.data[0];

    if (!subscription) {
      return new Response("No active subscription found", { status: 400 });
    }

    // Get the addon product
    const addonProduct = await stripe.products.retrieve(
      STRIPE_CREDS_ADDON_PRODUCT_ID
    );
    const mainProduct = await stripe.products.retrieve(STRIPE_API_PRODUCT_ID);

    switch (actionType) {
      case "add_addon": {
        // Check if addon is already present
        const hasAddon = subscription.items.data.some(
          (item) => item.price.product === STRIPE_CREDS_ADDON_PRODUCT_ID
        );

        if (hasAddon) {
          const schedules = await stripe.subscriptionSchedules.list({
            customer: team.data.stripe_customer_id,
          });

          for (const schedule of schedules.data.filter(
            (s) => s.status === "active"
          )) {
            await stripe.subscriptionSchedules.release(schedule.id);
          }
          break;
        }

        await stripe.subscriptionItems.create({
          subscription: subscription.id,
          price: addonProduct.default_price as string,
          proration_behavior: "always_invoice",
        });

        break;
      }
      case "remove_addon": {
        const addonItem = subscription.items.data.find(
          (item) => item.price.product === STRIPE_CREDS_ADDON_PRODUCT_ID
        );

        if (!addonItem) {
          return new Response("Addon not found", { status: 400 });
        }

        const schedules = await stripe.subscriptionSchedules.list({
          customer: team.data.stripe_customer_id,
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
                  price: mainProduct.default_price as string,
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
                  price: mainProduct.default_price as string,
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
        ? "System credentials addon added successfully"
        : "System credentials addon removed successfully"
    );

    return redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Error managing addon:", error);

    const redirectUrl = new URL(`/${teamId}/billing`, request.url);
    redirectUrl.searchParams.set("toast_type", "error");
    redirectUrl.searchParams.set(
      "toast",
      "Failed to update addon. Please try again."
    );

    return redirect(redirectUrl.toString());
  }
});

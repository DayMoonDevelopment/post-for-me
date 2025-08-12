import { redirect } from "react-router";
import { z } from "zod";

import { stripe } from "~/lib/.server/stripe";
import { withSupabase } from "~/lib/.server/supabase";
import {
  STRIPE_API_PRODUCT_ID,
  STRIPE_CREDS_ADDON_PRODUCT_ID,
} from "~/lib/.server/stripe.constants";

const addonActionSchema = z.object({
  action: z.enum(["add_addon", "remove_addon"]),
});

export const action = withSupabase(
  async ({ supabase, supabaseServiceRole, params, request }) => {
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
      .select("id, name, stripe_customer_id, team_addons(addon, expires_at)")
      .eq("id", teamId)
      .single();

    if (team.error || !team.data.stripe_customer_id) {
      return new Response("Team not found or no billing setup", {
        status: 404,
      });
    }

    const formData = await request.formData();
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

          const item = await stripe.subscriptionItems.create({
            subscription: subscription.id,
            price: addonProduct.default_price as string,
            proration_behavior: "always_invoice",
          });

          const expiresAt = new Date(item.current_period_end * 1000);

          await supabaseServiceRole.from("team_addons").upsert(
            {
              team_id: teamId,
              addon: "managed_system_credentials",
              expires_at: expiresAt.toISOString(),
            },
            { onConflict: "team_id, addon" }
          );

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
  }
);

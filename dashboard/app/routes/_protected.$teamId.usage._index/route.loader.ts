import type Stripe from "stripe";
import { stripe } from "~/lib/.server/stripe";
import { withSupabase } from "~/lib/.server/supabase";
import { STRIPE_METER_EVENT_ID } from "~/lib/.server/stripe.constants";
import { getSubscriptionPlanInfo } from "~/lib/.server/get-subscription-plan-info";

export const loader = withSupabase(async ({ supabase, params }) => {
  const { teamId } = params;

  if (!teamId) {
    throw new Error("Team code is required");
  }

  const team = await supabase
    .from("teams")
    .select("id, name, stripe_customer_id")
    .eq("id", teamId)
    .single();

  if (team.error) {
    return new Response("Team not found", { status: 404 });
  }

  let usage: number | null = null;
  let subscriptionPeriod: { start: Date; end: Date } | null = null;
  let planInfo = null;

  if (team.data.stripe_customer_id && STRIPE_METER_EVENT_ID) {
    try {
      // Get the active subscription to determine the billing period
      const subscriptions = await stripe.subscriptions.list({
        customer: team.data.stripe_customer_id,
        status: "active",
        limit: 1,
        expand: ["data.items.data.price"],
      });

      const subscription = subscriptions.data[0];

      if (subscription) {
        // Get plan info to determine post limit
        planInfo = getSubscriptionPlanInfo(subscription);

        const item = subscription.items.data[0];
        const startTime = item.current_period_start;
        const endTime = Math.floor(Date.now() / 1000);

        subscriptionPeriod = {
          start: new Date(startTime * 1000),
          end: new Date(endTime * 1000),
        };

        // Query meter event summaries for the current subscription period
        const meterEventSummaries =
          await stripe.billing.meters.listEventSummaries(
            STRIPE_METER_EVENT_ID,
            {
              customer: team.data.stripe_customer_id,
              start_time: startTime,
              end_time: endTime,
            },
          );

        // Sum up the usage from all meter event summaries
        usage = meterEventSummaries.data.reduce(
          (sum: number, summary: Stripe.Billing.MeterEventSummary) =>
            sum + (summary.aggregated_value || 0),
          0,
        );
      }
    } catch (error) {
      console.error("Error fetching usage from Stripe:", error);
      // Return null usage if there's an error
      usage = null;
    }
  }

  return {
    team: team.data,
    usage,
    subscriptionPeriod,
    hasStripeCustomer: !!team.data.stripe_customer_id,
    planInfo,
  };
});

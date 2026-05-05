import { createClient } from "@supabase/supabase-js";
import { logger, task } from "@trigger.dev/sdk";
import type Stripe from "stripe";
import { Database } from "@post-for-me/db";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY!);

const supabaseClient = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type IncrementTeamUsagePayload = {
  team_id: string;
  stripe_customer_id: string;
};

const getSubscriptionItemProduct = async (
  item: Stripe.SubscriptionItem,
): Promise<Stripe.Product> => {
  const product = item.price.product;

  if (typeof product === "string") {
    return stripe.products.retrieve(product);
  }

  if ("deleted" in product && product.deleted) {
    throw new Error("Subscription product is deleted");
  }

  return product;
};

const getSocialPostLimit = async (
  item: Stripe.SubscriptionItem,
): Promise<number> => {
  const product = await getSubscriptionItemProduct(item);
  const limitValue = product.metadata.social_post_limit;
  const limit = Number(limitValue);

  if (!limitValue || !Number.isFinite(limit) || limit <= 0) {
    throw new Error("Missing or invalid social_post_limit product metadata");
  }

  return limit;
};

export const incrementTeamUsage = task({
  id: "increment-team-usage",
  maxDuration: 300,
  retry: { maxAttempts: 2 },
  run: async (payload: IncrementTeamUsagePayload) => {
    const { team_id, stripe_customer_id } = payload;

    const subscriptions = await stripe.subscriptions.list({
      customer: stripe_customer_id,
      status: "active",
      limit: 1,
      expand: ["data.items.data.price.product"],
    });

    const subscription: Stripe.Subscription | undefined = subscriptions.data[0];

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    const subscriptionItem = subscription.items.data[0];

    if (!subscriptionItem) {
      throw new Error("No subscription items found");
    }

    const limit = await getSocialPostLimit(subscriptionItem);

    const startAt = new Date(
      subscriptionItem.current_period_start * 1000,
    ).toISOString();
    const endAt = new Date(subscriptionItem.current_period_end * 1000).toISOString();

    const { data: count, error } = await supabaseClient.rpc(
      "increment_team_usage",
      {
        p_team_id: team_id,
        p_limit: limit,
        p_start_at: startAt,
        p_end_at: endAt,
      },
    );

    if (error) {
      throw error;
    }

    logger.info("Incremented team usage", {
      team_id,
      stripe_customer_id,
      subscription_id: subscription.id,
      count,
      limit,
      start_at: startAt,
      end_at: endAt,
    });

    return {
      count,
      limit,
      start_at: startAt,
      end_at: endAt,
      subscription_id: subscription.id,
    };
  },
});

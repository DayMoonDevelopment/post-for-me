import { createClient } from "@supabase/supabase-js";
import { logger, task } from "@trigger.dev/sdk";
import Stripe from "stripe";
import { Database } from "./supabase.types";
import { resolveBillableSubscription } from "./resolve-subscription-entitlement";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
  const productId = typeof product === "string" ? product : product.id;

  const retrievedProduct = await stripe.products.retrieve(productId);

  if ("deleted" in retrievedProduct && retrievedProduct.deleted) {
    throw new Error("Subscription product is deleted");
  }

  return retrievedProduct;
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

    // Resolved through the same selection enforcement uses, rather than asking
    // Stripe for `status: "active"` directly. Access is granted to trialing
    // teams and — for PAYMENT_GRACE_PERIOD_DAYS — to teams whose payment
    // failed, neither of which is `active`. Querying for `active` meant every
    // post those teams published metered nothing: the post shipped, then this
    // task threw "No active subscription found" after the fact, so
    // social_post_usage never incremented and process-usage-limits never saw
    // the overage.
    const subscription = await resolveBillableSubscription(stripe_customer_id);

    if (!subscription) {
      throw new Error(
        `No billable subscription found for customer ${stripe_customer_id}; a post published for a team with no subscription backing access`,
      );
    }

    const subscriptionItem = subscription.items.data[0];

    if (!subscriptionItem) {
      throw new Error("No subscription items found");
    }

    const limit = await getSocialPostLimit(subscriptionItem);

    const startAt = new Date(
      subscriptionItem.current_period_start * 1000,
    ).toISOString();
    const endAt = new Date(
      subscriptionItem.current_period_end * 1000,
    ).toISOString();

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

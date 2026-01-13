import { stripe } from "~/lib/.server/stripe";
import { withSupabase } from "~/lib/.server/supabase";
import {
  STRIPE_CREDS_ADDON_PRODUCT_ID,
  PRICING_TIERS,
  STRIPE_CANCELLED_STATUSES,
} from "~/lib/.server/stripe.constants";
import { getSubscriptionPlanInfo } from "~/lib/.server/get-subscription-plan-info";
import type Stripe from "stripe";

export const loader = withSupabase(async ({ supabase, params, request }) => {
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
    .select("id, name, billing_email, stripe_customer_id")
    .eq("id", teamId)
    .single();

  if (team.error) {
    return new Response("Team not found", { status: 404 });
  }

  const teamDashboardUrl = new URL(
    `/${team.data.id}/billing`,
    request.url,
  ).toString();

  const stripeSuccessUrl = new URL(
    `/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
    request.url,
  ).toString();

  let subscription: Stripe.Subscription | null = null;
  let hasSubscription = false;
  let hasActiveSubscription = false;
  let hasCredsAddon = false;
  let hasCredsAccess = false;
  let portalUrl: string | null = null;
  let upcomingInvoice: Stripe.Invoice | null = null;
  let planInfo = null;
  let isLegacyPlan = false;
  let isNewPricingPlan = false;
  let cancelAt: number | null = null;

  if (team.data.stripe_customer_id) {
    // Fetch the most recent subscription, but ignore statuses we can't update.
    const subscriptions = await stripe.subscriptions.list({
      customer: team.data.stripe_customer_id,
      status: "all",
      limit: 1,
      expand: ["data.items.data.price"],
    });

    const latestSubscription = subscriptions.data[0] || null;

    if (
      latestSubscription &&
      STRIPE_CANCELLED_STATUSES.indexOf(latestSubscription.status) < 0
    ) {
      subscription = latestSubscription;
      hasSubscription = true;
      planInfo = getSubscriptionPlanInfo(subscription);
      isLegacyPlan = planInfo.isLegacy;
      isNewPricingPlan = planInfo.isNewPricing;

      hasActiveSubscription =
        subscription.status === "active" || subscription.status === "trialing";

      hasCredsAccess = subscription.items.data.some(
        (item) => item.price.product === STRIPE_CREDS_ADDON_PRODUCT_ID,
      );

      cancelAt = subscription.cancel_at;

      const schedules = await stripe.subscriptionSchedules.list({
        customer: team.data.stripe_customer_id,
      });

      hasCredsAddon =
        schedules.data.filter((s) => s.status === "active").length > 0
          ? false
          : hasCredsAccess;

      try {
        upcomingInvoice = await stripe.invoices.createPreview({
          subscription: subscription.id,
        });
      } catch (error) {
        console.error(error);
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: team.data.stripe_customer_id,
        return_url: teamDashboardUrl,
      });
      portalUrl = portalSession.url;

      return {
        team: team.data,
        subscription,
        hasSubscription,
        hasActiveSubscription,
        hasCredsAddon,
        portalUrl,
        checkoutUrl: null,
        hasCredsAccess,
        upcomingInvoice,
        planInfo,
        isLegacyPlan,
        isNewPricingPlan,
        cancelAt,
        pricingTiers: PRICING_TIERS,
      };
    }
  }

  // No current subscription
  const checkoutUrl = await createCheckoutSessionUrl({
    teamData: team.data,
    teamDashboardUrl,
    currentUserData: currentUser.data.user,
    stripeSuccessUrl,
  });

  return {
    team: team.data,
    subscription,
    hasSubscription,
    hasActiveSubscription,
    hasCredsAddon,
    portalUrl,
    checkoutUrl,
    hasCredsAccess,
    upcomingInvoice,
    planInfo,
    isLegacyPlan,
    isNewPricingPlan,
    cancelAt,
    pricingTiers: PRICING_TIERS,
  };
});

async function createCheckoutSessionUrl({
  teamData,
  teamDashboardUrl,
  currentUserData,
  stripeSuccessUrl,
}: {
  customerId?: string;
  customerEmail?: string;
  teamDashboardUrl: string;
  stripeSuccessUrl: string;
  teamData: {
    stripe_customer_id?: string | null;
    billing_email?: string | null;
    id: string;
    name: string;
  };
  currentUserData: { id: string };
}): Promise<string | null> {
  if (teamData.stripe_customer_id) {
    const defaultTier = PRICING_TIERS[0];
    if (defaultTier) {
      const product = await stripe.products.retrieve(defaultTier.productId);
      const checkoutSession = await stripe.checkout.sessions.create({
        client_reference_id: teamData.id,
        customer: teamData.stripe_customer_id || undefined,
        mode: "subscription",
        line_items: [
          {
            price: product.default_price as string,
            quantity: 1,
          },
        ],
        metadata: {
          team_id: teamData.id,
          team_name: teamData.name,
          created_by: currentUserData.id,
        },
        success_url: stripeSuccessUrl,
        cancel_url: teamDashboardUrl,
      });
      return checkoutSession.url;
    }
  }
  const defaultTier = PRICING_TIERS[0];
  if (defaultTier) {
    const product = await stripe.products.retrieve(defaultTier.productId);
    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: teamData.billing_email || undefined,
      mode: "subscription",
      line_items: [
        {
          price: product.default_price as string,
          quantity: 1,
        },
      ],
      client_reference_id: teamData.id,
      metadata: {
        team_id: teamData.id,
        team_name: teamData.name,
        created_by: currentUserData.id,
      },
      success_url: stripeSuccessUrl,
      cancel_url: teamDashboardUrl,
    });
    return checkoutSession.url;
  }

  return null;
}

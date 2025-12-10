import { stripe } from "~/lib/.server/stripe";
import { withSupabase } from "~/lib/.server/supabase";
import {
  STRIPE_API_PRODUCT_ID,
  STRIPE_CREDS_ADDON_PRODUCT_ID,
  PRICING_TIERS,
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

  let subscription = null;
  let hasActiveSubscription = false;
  let hasCredsAddon = false;
  let hasCredsAccess = false;
  let portalUrl = null;
  let checkoutUrl = null;
  let upcomingInvoice: Stripe.Invoice | null = null;
  let planInfo = null;
  let isLegacyPlan = false;
  let isNewPricingPlan = false;

  if (team.data.stripe_customer_id) {
    const subscriptions = await stripe.subscriptions.list({
      customer: team.data.stripe_customer_id,
      status: "active",
      expand: ["data.items.data.price"],
    });

    subscription = subscriptions.data[0] || null;

    if (subscription) {
      planInfo = getSubscriptionPlanInfo(subscription);
      isLegacyPlan = planInfo.isLegacy;
      isNewPricingPlan = planInfo.isNewPricing;

      hasActiveSubscription =
        isLegacyPlan ||
        isNewPricingPlan ||
        subscription.items.data.some(
          (item) => item.price.product === STRIPE_API_PRODUCT_ID,
        );

      hasCredsAccess = subscription.items.data.some(
        (item) => item.price.product === STRIPE_CREDS_ADDON_PRODUCT_ID,
      );

      const schedules = await stripe.subscriptionSchedules.list({
        customer: team.data.stripe_customer_id,
      });

      hasCredsAddon =
        schedules.data.filter((s) => s.status === "active").length > 0
          ? false
          : hasCredsAccess;

      upcomingInvoice = await stripe.invoices.createPreview({
        subscription: subscription.id,
      });
    }

    if (hasActiveSubscription) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: team.data.stripe_customer_id,
        return_url: teamDashboardUrl,
      });
      portalUrl = portalSession.url;
    } else {
      // No active subscription - show new pricing checkout
      // Default to first tier if available
      const defaultTier = PRICING_TIERS[0];
      if (defaultTier) {
        const product = await stripe.products.retrieve(defaultTier.productId);
        const checkoutSession = await stripe.checkout.sessions.create({
          client_reference_id: team.data.id,
          customer: team.data.stripe_customer_id,
          mode: "subscription",
          line_items: [
            {
              price: product.default_price as string,
              quantity: 1,
            },
          ],
          metadata: {
            team_id: team.data.id,
            team_name: team.data.name,
            created_by: currentUser.data.user.id,
          },
          success_url: new URL(
            `/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
            request.url,
          ).toString(),
          cancel_url: teamDashboardUrl,
        });
        checkoutUrl = checkoutSession.url;
      }
    }
  } else {
    // No Stripe customer - show new pricing checkout
    const defaultTier = PRICING_TIERS[0];
    if (defaultTier) {
      const product = await stripe.products.retrieve(defaultTier.productId);
      const checkoutSession = await stripe.checkout.sessions.create({
        customer_email: team.data.billing_email || undefined,
        mode: "subscription",
        line_items: [
          {
            price: product.default_price as string,
            quantity: 1,
          },
        ],
        client_reference_id: team.data.id,
        metadata: {
          team_id: team.data.id,
          team_name: team.data.name,
          created_by: currentUser.data.user.id,
        },
        success_url: new URL(
          "/stripe/success?session_id={CHECKOUT_SESSION_ID}",
          request.url,
        ).toString(),
        cancel_url: new URL(`/${teamId}`, request.url).toString(),
      });
      checkoutUrl = checkoutSession.url;
    }
  }

  return {
    team: team.data,
    subscription,
    hasActiveSubscription,
    hasCredsAddon,
    portalUrl,
    checkoutUrl,
    hasCredsAccess,
    upcomingInvoice,
    planInfo,
    isLegacyPlan,
    isNewPricingPlan,
    pricingTiers: PRICING_TIERS,
  };
});

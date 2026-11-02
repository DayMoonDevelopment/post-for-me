import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";

/**
 * Ties the browser session to the authenticated user and the `team` billing
 * group, so dashboard pageviews share a person + group with the server-side
 * billing events the API emits from the Stripe webhook. Renders nothing; mounted
 * once in the protected layout where both user and team are resolved.
 *
 * Ad-attribution person properties (`$initial_gclid`, etc.) are captured
 * automatically by the PostHog client (see `posthog-provider`) — we don't set
 * them here. We only set durable identity props we own.
 */
export function PostHogIdentifier({
  user,
  team,
}: {
  team?: {
    billingEmail: string | null;
    id: string;
    name: string;
    stripeCustomerId: string | null;
  } | null;
  user: {
    email: string | null;
    firstName?: string | null;
    id: string;
    lastName?: string | null;
  };
}) {
  const posthog = usePostHog();

  useEffect(() => {
    if (!posthog || !user.id) return;
    // Only send props we have — undefined would overwrite existing person props.
    const properties: Record<string, unknown> = {};
    if (user.email) properties.email = user.email;
    if (user.firstName) properties.first_name = user.firstName;
    if (user.lastName) properties.last_name = user.lastName;
    posthog.identify(user.id, properties);
  }, [posthog, user.id, user.email, user.firstName, user.lastName]);

  useEffect(() => {
    if (!posthog || !team?.id) return;
    posthog.group("team", team.id, {
      name: team.name,
      stripe_customer_id: team.stripeCustomerId,
      billing_email: team.billingEmail,
    });
  }, [posthog, team?.id, team?.name, team?.stripeCustomerId, team?.billingEmail]);

  return null;
}

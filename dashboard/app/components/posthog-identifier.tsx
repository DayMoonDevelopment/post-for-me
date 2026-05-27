import posthog from "posthog-js";
import { useEffect } from "react";
import { useRouteLoaderData } from "react-router";

import type { loader } from "~/routes/_protected.$teamId/route";

/**
 * Identifies the authenticated user and registers the current `team` group with
 * PostHog so browser pageviews share a person/group with the server-side
 * billing events emitted from the Stripe webhook. Renders nothing; mounted once
 * inside the `_protected.$teamId` layout where both user and team are resolved.
 */
export function PostHogIdentifier() {
  const data = useRouteLoaderData<typeof loader>("routes/_protected.$teamId");

  const user = data?.user;
  const team = data?.team;

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    posthog.identify(user.id, {
      email: user.email,
      created_at: user.created_at,
    });
  }, [user?.id, user?.email, user?.created_at]);

  useEffect(() => {
    if (!team?.id) {
      return;
    }

    posthog.group("team", team.id, {
      name: team.name,
      stripe_customer_id: team.stripe_customer_id,
      billing_email: team.billing_email,
    });
  }, [team?.id, team?.name, team?.stripe_customer_id, team?.billing_email]);

  return null;
}

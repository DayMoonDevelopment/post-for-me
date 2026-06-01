import posthog from "posthog-js";
import { useEffect } from "react";
import { useRouteLoaderData } from "react-router";

import {
  readAttributionFromBrowser,
  readMetaPixelCookiesFromBrowser,
} from "./attribution";

import type { loader } from "~/routes/_protected.$teamId/route";
import type { loader as projectLoader } from "~/routes/_protected.$teamId.$projectId/route.loader";

/**
 * Identifies the authenticated user and registers the current `team` group with
 * PostHog so browser pageviews share a person/group with the server-side
 * billing events emitted from the Stripe webhook. Also sets the person
 * properties the PostHog → Meta/Google Ads destinations read for conversion
 * matching (email, first/last name, click IDs, UTMs). Renders nothing; mounted
 * once inside the `_protected.$teamId` layout where both user and team are
 * resolved.
 */
export function PostHogIdentifier() {
  const data = useRouteLoaderData<typeof loader>("routes/_protected.$teamId");
  // Present only when the user is on a project-scoped route. Lets us register the
  // `project` group so pageviews roll up to the project they're acting on.
  const projectData = useRouteLoaderData<typeof projectLoader>(
    "routes/_protected.$teamId.$projectId",
  );

  const user = data?.user;
  const team = data?.team;
  const project = projectData?.project;

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const metadata = user.user_metadata as
      | { first_name?: string; last_name?: string }
      | undefined;
    const attribution = readAttributionFromBrowser();
    const metaCookies = readMetaPixelCookiesFromBrowser();

    // Send only properties we actually have — undefined values would overwrite
    // existing person props with `undefined`.
    const personProperties: Record<string, unknown> = {
      email: user.email,
      created_at: user.created_at,
    };
    if (metadata?.first_name) personProperties.first_name = metadata.first_name;
    if (metadata?.last_name) personProperties.last_name = metadata.last_name;
    if (attribution?.gclid) personProperties.gclid = attribution.gclid;
    if (attribution?.fbclid) personProperties.fbclid = attribution.fbclid;
    if (attribution?.utm_source) personProperties.utm_source = attribution.utm_source;
    if (attribution?.utm_medium) personProperties.utm_medium = attribution.utm_medium;
    if (attribution?.utm_campaign) personProperties.utm_campaign = attribution.utm_campaign;
    if (attribution?.utm_term) personProperties.utm_term = attribution.utm_term;
    if (attribution?.utm_content) personProperties.utm_content = attribution.utm_content;
    // `_fbc` from Meta Pixel — the destination prefers this over raw fbclid.
    if (metaCookies.fbc) personProperties.fbc = metaCookies.fbc;
    if (metaCookies.fbp) personProperties.fbp = metaCookies.fbp;

    posthog.identify(user.id, personProperties);
  }, [user?.id, user?.email, user?.created_at, user?.user_metadata]);

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

  useEffect(() => {
    if (!project?.id) {
      return;
    }

    posthog.group("project", project.id, {
      name: project.name,
      team_id: project.team_id,
    });
  }, [project?.id, project?.name, project?.team_id]);

  return null;
}

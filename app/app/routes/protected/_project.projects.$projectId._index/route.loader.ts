import type { SetupContext } from "~/components/launchpad";

import { servicesContext } from "~/lib/.server/services";

import type { Route } from "./+types/route";

/**
 * The project home (`/projects/$projectId`) — the launchpad for THIS project.
 * The URL is the source of truth for which project is active; this loader builds
 * the {@link SetupContext} the launchpad reads to order, gate, and check off the
 * setup steps. The team comes from the project (`project.teamId`); RLS scopes
 * the read, throwing (→ boundary) if the project isn't the user's.
 *
 * `billingComplete` is real (live Stripe subscription on the team). The rest are
 * stubbed `false` until their services land — each becomes a local change here.
 */
export async function loader({ params, context }: Route.LoaderArgs) {
  const { projects, teams, providerCredentials } = context.get(servicesContext);
  const [project, teamList] = await Promise.all([
    projects.get(params.projectId),
    teams.list(),
  ]);
  const team = teamList.find((candidate) => candidate.id === project.teamId);

  // Reflect billing state when the team already has a Stripe customer. Guarded
  // on the env (the client module throws without a key) and dynamically imported
  // so that throw can't reach this page in setups without billing.
  let billingComplete = false;
  if (team?.stripeCustomerId && process.env.STRIPE_SECRET_KEY) {
    try {
      const { stripe } = await import("~/lib/.server/stripe/client");
      const active = await stripe.subscriptions.list({
        customer: team.stripeCustomerId,
        status: "active",
        limit: 1,
      });
      billingComplete = active.data.length > 0;
    } catch (error) {
      console.error("project home: failed to read subscription status", error);
    }
  }

  // White-label projects are "credentials complete" once every configured
  // platform (a credential row) has both an app id and secret. Quickstart rides
  // the shared system credentials, so the flag is irrelevant.
  let credentialsComplete = false;
  if (project.type === "white-label") {
    try {
      const creds = await providerCredentials.list(project.id);
      credentialsComplete =
        creds.length > 0 &&
        creds.every((c) => c.appId.trim() && c.appSecret.trim());
    } catch (error) {
      console.error("project home: failed to read project credentials", error);
    }
  }

  const setup: SetupContext = {
    teamId: team?.id ?? null,
    projectId: project.id,
    projectType: project.type,
    billingComplete,
    credentialsComplete,
    apiKeyCreated: false,
    accountConnected: false,
    firstPostPublished: false,
  };

  return { setup };
}

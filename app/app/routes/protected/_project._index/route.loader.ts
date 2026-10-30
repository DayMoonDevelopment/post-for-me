import { redirect } from "react-router";

import type { SetupContext } from "~/components/launchpad";

import { resolveActiveProject } from "~/lib/.server/active-team";
import { servicesContext } from "~/lib/.server/services";

import type { Route } from "./+types/route";

/**
 * Bare entry (`/`). The active project lives in the URL (`/projects/$projectId`),
 * so the root just bounces you to your last-active project (cookie → first
 * project) — that's how the selection survives a fresh visit. The launchpad
 * itself now lives at the project home. A brand-new user with NO project yet
 * stays here, rendering an empty launchpad while the layout's onboarding modal
 * runs.
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const { projects } = context.get(servicesContext);
  const projectList = await projects.list();

  const active = resolveActiveProject(request, projectList);
  if (active) {
    throw redirect(`/projects/${active.id}`);
  }

  const setup: SetupContext = {
    teamId: null,
    projectId: null,
    projectType: "quickstart",
    billingComplete: false,
    credentialsComplete: false,
    apiKeyCreated: false,
    accountConnected: false,
    firstPostPublished: false,
  };
  return { setup };
}

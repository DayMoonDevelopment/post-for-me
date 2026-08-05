import { logError } from "~/lib/.server/errors";
import { requireTeamMember } from "~/lib/.server/guards";
import { servicesContext } from "~/lib/.server/services";

import type { Route } from "./+types/route";

/**
 * `GET /projects/:projectId/api-keys` — the project's API keys (never secrets),
 * via the provider-agnostic service. RLS-equivalent scoping happens in the
 * adapter (keys are partitioned by `externalId = projectId`); the team guard
 * fails fast for a non-member.
 *
 * The keys backend (Unkey) is a third-party dependency that may be unconfigured
 * (local dev) or down. Rather than throw the whole page to the error boundary,
 * we degrade: log the failure and render an "unavailable" notice with an empty
 * list, so the surface stays usable.
 */
export async function loader({ params, context }: Route.LoaderArgs) {
  const projectId = params.projectId;
  const { apiKeys, projects } = context.get(servicesContext);

  const project = await projects.get(projectId);
  await requireTeamMember(context, project.teamId);

  try {
    const keys = await apiKeys.list(projectId);
    return { keys, projectId, unavailable: false };
  } catch (error) {
    logError(error, { projectId, surface: "api-keys.loader" });
    return { keys: [], projectId, unavailable: true };
  }
}

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

  // Streamed rather than awaited, so the page shell — and the table's skeleton
  // rows — paint immediately and the rows land when the keys backend answers.
  // The guards above stay awaited: a non-member must never reach the shell.
  //
  // The degrade path rides on the promise instead of a try/catch, so an
  // unconfigured or unreachable backend still resolves to the "unavailable"
  // notice rather than rejecting into the error boundary.
  const keysResult = apiKeys
    .list(projectId)
    .then((keys) => ({ keys, unavailable: false }))
    .catch((error) => {
      logError(error, { projectId, surface: "api-keys.loader" });
      return { keys: [], unavailable: true };
    });

  return { keysResult, projectId };
}

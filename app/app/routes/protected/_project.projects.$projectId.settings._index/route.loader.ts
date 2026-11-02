import { servicesContext } from "~/lib/.server/services";

import type { Route } from "./+types/route";

/**
 * `GET /projects/:projectId/settings` — the project's configurable state, for
 * both the settings page (its own loader) and the project-setup modal (which
 * fetches THIS loader, so the two surfaces share one source of data + mutations).
 *
 * Nested under `_protected`, so auth is already enforced; RLS scopes every read
 * to the user's accessible projects (`projects.get` throws if not). Returns the
 * project, its configured white-label credentials, and the supported-platform
 * universe.
 */
export async function loader({ params, context }: Route.LoaderArgs) {
  const { projects, providerCredentials } = context.get(servicesContext);
  const projectId = params.projectId;

  const project = await projects.get(projectId);

  // SECURITY: NO credential value is in this payload, for either project type.
  //
  // Quickstart (PFM-684) rides Post for Me's shared SYSTEM credentials, which
  // must never reach a client under any circumstance — for those the service
  // reads provider NAMES ONLY, so the secrets aren't even selected.
  //
  // White-label keys belong to the member, but they're still secrets: shipping
  // them in every settings document means they sit in the HTML, in the RSC
  // payload, and in any proxy or devtools log, whether or not anyone asked to
  // see them. So the loader carries presence booleans, and the VALUES are
  // fetched one provider at a time, on explicit user action, through
  // `/api/projects/:projectId/credentials`.
  const [credentials, supportedProviders] = await Promise.all([
    providerCredentials.listCredentialStatuses(projectId),
    providerCredentials.listSupportedProviders(),
  ]);

  return { project, credentials, supportedProviders };
}

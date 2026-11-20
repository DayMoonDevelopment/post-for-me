import { data } from "react-router";

import type { SocialAccount } from "~/lib/post-for-me.types";

import { resolveProjectApiClient } from "~/lib/.server/api/project-api";
import { createApiSocialAccountsService } from "~/lib/.server/services/social-accounts.api";
import { brandProvider } from "~/lib/platform-meta";

import type { Route } from "./+types/route";

/**
 * `GET /projects/:projectId/playground` — loads the project's **connected** accounts as
 * the Posting Playground's compose targets, read from the real API via a temporary
 * project key ({@link resolveProjectApiClient} guards membership + the active-subscription
 * gate). Each app {@link SocialAccount} is mapped down to the registry composer's
 * `SocialAccount` shape ({@link brandProvider} collapses the dashboard-only
 * `instagram_w_facebook` pseudo-platform to the registry's `instagram`). When the API is
 * unavailable (no subscription / misconfig) we render an in-page notice instead of erroring.
 * The minted-key Set-Cookie is merged in.
 */
export async function loader({ params, request, context }: Route.LoaderArgs) {
  const projectId = params.projectId;

  const api = await resolveProjectApiClient(context, request, projectId);
  const init = api.headers ? { headers: api.headers } : undefined;

  if (!api.apiClient) {
    return data(
      {
        accounts: [] as SocialAccount[],
        projectId,
        unavailable: true,
        reason: api.reason ?? "error",
        teamId: api.teamId,
      },
      init,
    );
  }

  const service = createApiSocialAccountsService(api.apiClient, projectId);
  const { accounts } = await service.list(projectId, {
    status: ["connected"],
    pageSize: 100,
  });

  const targets: SocialAccount[] = accounts.map((account) => ({
    id: account.id,
    platform: brandProvider(account.platform),
    username: account.username ?? "",
    avatarUrl: account.avatarUrl,
  }));

  return data(
    {
      accounts: targets,
      projectId,
      unavailable: false,
      reason: undefined,
      teamId: api.teamId,
    },
    init,
  );
}

import { data } from "react-router";

import { resolveProjectApiClient } from "~/lib/.server/api/project-api";
import { resolveSocialAccountProject } from "~/lib/.server/api/resource-project";
import { toActionError } from "~/lib/.server/errors";
import { createApiSocialAccountsService } from "~/lib/.server/services/social-accounts.api";
import { supabaseContext } from "~/lib/.server/supabase";
import { actionError } from "~/lib/action-result";
import { getServerT } from "~/lib/i18n/i18n.server";

import type { Route } from "./+types/route";

/**
 * `POST /social-accounts/:socialAccountId` — the detail page's `disconnect`
 * mutation (clears the tokens, retains the row → reads as `disconnected`), run
 * through the real API via a temporary project key. The account is mapped to its
 * owning project ({@link resolveSocialAccountProject}) to scope the key.
 *
 * Token reveal is NOT here — the values are served only by the dedicated
 * `/api/social-accounts/:socialAccountId/tokens` resource route. Recoverable
 * failures toast via {@link actionError}; the minted-key Set-Cookie is merged in.
 */
export async function action({ request, params, context }: Route.ActionArgs) {
  const t = await getServerT(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const id = params.socialAccountId;

  const supabase = context.get(supabaseContext);
  const projectId = await resolveSocialAccountProject(supabase, id);
  if (!projectId) throw new Response("Not found", { status: 404 });

  const api = await resolveProjectApiClient(context, request, projectId);
  const init = api.headers ? { headers: api.headers } : undefined;
  if (!api.apiClient) {
    const message =
      api.reason === "no_subscription"
        ? t("socialAccounts.errors.subscription")
        : t("socialAccounts.errors.generic");
    return data(actionError(message), init);
  }

  const service = createApiSocialAccountsService(api.apiClient, projectId);

  if (intent === "disconnect") {
    try {
      await service.disconnect(id);
      return data({ ok: true }, init);
    } catch (error) {
      return data(toActionError(error, { projectId, accountId: id }), init);
    }
  }

  return data(actionError(t("socialAccounts.errors.generic")), init);
}

import { data } from "react-router";

import { resolveProjectApiClient } from "~/lib/.server/api/project-api";
import { toActionError } from "~/lib/.server/errors";
import { createApiSocialAccountsService } from "~/lib/.server/services/social-accounts.api";
import { actionError } from "~/lib/action-result";
import { getServerT } from "~/lib/i18n/i18n.server";

import type { Route } from "./+types/route";

/**
 * `POST /projects/:projectId/social-accounts` — the row-level `disconnect`
 * mutation posted by the grid's `useFetcher`, run through the real API via a
 * temporary project key. Disconnect clears the account's tokens (retains the
 * row). Recoverable failures return a toastable {@link actionError} rather than
 * throwing to the error boundary. The minted-key Set-Cookie is merged in.
 */
export async function action({ params, request, context }: Route.ActionArgs) {
  const t = await getServerT(request);
  const projectId = params.projectId;
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const id = String(form.get("id") ?? "");

  const api = await resolveProjectApiClient(context, request, projectId);
  const init = api.headers ? { headers: api.headers } : undefined;
  if (!api.apiClient) {
    const message =
      api.reason === "no_subscription"
        ? t("socialAccounts.errors.subscription")
        : t("socialAccounts.errors.generic");
    return data(actionError(message), init);
  }

  if (!id) return data(actionError(t("socialAccounts.errors.generic")), init);

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

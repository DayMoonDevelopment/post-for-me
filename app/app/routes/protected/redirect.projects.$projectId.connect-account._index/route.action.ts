import { redirect } from "react-router";

import { resolveProjectApiClient } from "~/lib/.server/api/project-api";
import {
  ForbiddenException,
  InternalException,
  redirectBackWithAppException,
} from "~/lib/.server/errors";
import { createApiSocialAccountsService } from "~/lib/.server/services/social-accounts.api";
import { getServerT } from "~/lib/i18n/i18n.server";
import { isSocialProvider } from "~/lib/onboarding";

import type { Route } from "./+types/route";

/** The extra `createAuthURL` body fields (`permissions`, `platform_data`),
 * serialized by the connect modal as a JSON string. Malformed input degrades to
 * an empty config rather than throwing — the API validates the rest. */
function parseConfig(raw: FormDataEntryValue | null): Record<string, unknown> {
  if (typeof raw !== "string" || !raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * `POST /redirect/projects/:projectId/connect-account` — the side-effecting
 * "connect a social account" hand-off (PFM-696). Posted from the connect modal's
 * `<fetcher.Form>` so the button spins while the API mints the auth URL, then we
 * 302 off-origin to the provider's OAuth screen (RR turns that into a
 * `window.location.assign`). The provider return is handled by the existing
 * `callback.$projectId.$provider.account` route.
 *
 * A `redirect.*` route ALWAYS redirects — never renderable data. On failure it
 * 302s back to the originating page with the public message flashed (the root
 * toasts it). The minted-key Set-Cookie is merged into the success redirect.
 */
export async function action({ params, request, context }: Route.ActionArgs) {
  const projectId = params.projectId;
  const form = await request.formData();
  const returnToValue = form.get("return_to");
  const returnTo = typeof returnToValue === "string" ? returnToValue : null;

  try {
    const t = await getServerT(request);

    const api = await resolveProjectApiClient(context, request, projectId);
    if (!api.apiClient) {
      throw api.reason === "no_subscription"
        ? new ForbiddenException(t("socialAccounts.errors.subscription"))
        : new InternalException(t("socialAccounts.errors.generic"));
    }

    const platform = String(form.get("platform") ?? "");
    if (!isSocialProvider(platform)) {
      throw new InternalException(t("socialAccounts.errors.generic"));
    }
    const externalId = String(form.get("external_id") ?? "").trim();
    const config = parseConfig(form.get("config"));

    const service = createApiSocialAccountsService(api.apiClient, projectId);
    const { url } = await service.createAuthURL({
      projectId,
      platform,
      externalId: externalId || undefined,
      config,
    });

    return redirect(url, api.headers ? { headers: api.headers } : undefined);
  } catch (error) {
    return redirectBackWithAppException(request, error, {
      returnTo,
      context: { projectId },
    });
  }
}

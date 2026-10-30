import { isFuture, isValid, parseISO } from "date-fns";
import { data, redirect } from "react-router";

import type { SocialPostConfiguration } from "~/lib/social-post-configuration.types";

import { resolveProjectApiClient } from "~/lib/.server/api/project-api";
import { toActionError } from "~/lib/.server/errors";
import { createApiMediaService } from "~/lib/.server/services/media.api";
import { createApiSocialPostWriter } from "~/lib/.server/services/social-posts.api";
import { actionError } from "~/lib/action-result";
import { getServerT } from "~/lib/i18n/i18n.server";

import type { Route } from "./+types/route";

/** Parse a JSON form field, returning `fallback` on any malformed input. */
function parseJson<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (typeof value !== "string" || value === "") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * `POST /projects/:projectId/playground` — publish the composed post. Runs as the user via
 * a temporary project key. Uploads each picked media file to a signed URL (two-step:
 * create-upload-url → PUT), then creates the post (post-now / scheduled / saved-draft) with
 * the collected media URLs + the per-platform configuration. On success we redirect to the
 * created post; recoverable failures toast. The minted-key Set-Cookie is merged in.
 */
export async function action({ params, request, context }: Route.ActionArgs) {
  const t = await getServerT(request);
  const projectId = params.projectId;
  const form = await request.formData();

  const api = await resolveProjectApiClient(context, request, projectId);
  const init = api.headers ? { headers: api.headers } : undefined;
  if (!api.apiClient) {
    const message =
      api.reason === "no_subscription"
        ? t("playground.errors.subscription")
        : t("playground.errors.generic");
    return data(actionError(message), init);
  }

  const caption = String(form.get("caption") ?? "");
  const socialAccounts = parseJson<string[]>(form.get("social_accounts"), []);
  const configuration = parseJson<SocialPostConfiguration>(
    form.get("configuration"),
    {},
  );
  const scheduledAtRaw = String(form.get("scheduled_at") ?? "");
  const scheduledAt = scheduledAtRaw === "" ? null : scheduledAtRaw;
  const isDraft = form.get("is_draft") === "true";
  const files = form
    .getAll("media")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (socialAccounts.length === 0) {
    return data(actionError(t("playground.errors.noAccounts")), init);
  }

  // A schedule, if set, must be a valid instant in the future (defense-in-depth — the client
  // gates this too). The API also rejects past times, but we fail fast with a clear message.
  if (scheduledAt) {
    const date = parseISO(scheduledAt);
    if (!isValid(date) || !isFuture(date)) {
      return data(actionError(t("playground.errors.scheduleFuture")), init);
    }
  }

  try {
    const mediaService = createApiMediaService(api.apiClient);
    const uploadedUrls = await Promise.all(
      files.map((file) => mediaService.upload(file)),
    );

    const writer = createApiSocialPostWriter(api.apiClient);
    const created = await writer.create({
      caption,
      socialAccounts,
      media: uploadedUrls.map((url) => ({ url })),
      scheduledAt,
      isDraft,
      configuration,
    });

    return redirect(`/social-posts/${created.id}`, init);
  } catch (error) {
    return data(toActionError(error, { projectId }), init);
  }
}

import { data, redirect } from "react-router";

import { webhookFormSchema } from "~/components/webhook-form-dialog.schema";
import { resolveProjectApiClient } from "~/lib/.server/api/project-api";
import { toActionError } from "~/lib/.server/errors";
import { createApiWebhooksService } from "~/lib/.server/services/webhooks.api";
import { actionError } from "~/lib/action-result";
import { getServerT } from "~/lib/i18n/i18n.server";

import type { Route } from "./+types/route";

/**
 * `POST /projects/:projectId/webhooks/:webhookId` — update / delete a webhook
 * through the real API (runs as the user via a temporary project key). `update`
 * revalidates the loader; `delete` redirects back to the list. The minted-key
 * Set-Cookie is merged into every response.
 */
export async function action({ params, request, context }: Route.ActionArgs) {
  const t = await getServerT(request);
  const { projectId, webhookId } = params;
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  const api = await resolveProjectApiClient(context, request, projectId);
  const init = api.headers ? { headers: api.headers } : undefined;
  if (!api.apiClient) {
    const message =
      api.reason === "no_subscription"
        ? t("webhooks.errors.subscription")
        : t("webhooks.errors.generic");
    return data(actionError(message), init);
  }
  const webhooks = createApiWebhooksService(api.apiClient);

  if (intent === "delete") {
    try {
      await webhooks.delete(webhookId);
      return redirect(`/projects/${projectId}/webhooks`, init);
    } catch (error) {
      return data(toActionError(error, { projectId, webhookId }), init);
    }
  }

  if (intent === "update") {
    const parsed = webhookFormSchema.safeParse({
      url: form.get("url"),
      eventTypes: form.getAll("eventTypes").map(String),
    });
    if (!parsed.success) {
      return data(actionError(t("webhooks.errors.invalid")), init);
    }
    try {
      await webhooks.update(webhookId, {
        url: parsed.data.url,
        eventTypes: parsed.data.eventTypes,
      });
      return data({ ok: true }, init);
    } catch (error) {
      return data(toActionError(error, { projectId, webhookId }), init);
    }
  }

  return data(actionError(t("webhooks.errors.generic")), init);
}

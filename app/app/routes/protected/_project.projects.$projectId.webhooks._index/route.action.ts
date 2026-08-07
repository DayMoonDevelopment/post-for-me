import { data } from "react-router";

import { webhookFormSchema } from "~/components/webhook-form-dialog.schema";
import { resolveProjectApiClient } from "~/lib/.server/api/project-api";
import { toActionError } from "~/lib/.server/errors";
import { createApiWebhooksService } from "~/lib/.server/services/webhooks.api";
import { actionError } from "~/lib/action-result";
import { getServerT } from "~/lib/i18n/i18n.server";

import type { Route } from "./+types/route";

/**
 * `POST /projects/:projectId/webhooks` — create / update / delete a webhook
 * through the real API (the API mints the signing secret + enforces url+project
 * uniqueness). Runs as the user via a temporary project key. The url+project
 * conflict comes back as a friendly inline error; other recoverable failures
 * toast. The minted-key Set-Cookie is merged into the response.
 */
export async function action({ params, request, context }: Route.ActionArgs) {
  const t = await getServerT(request);
  const projectId = params.projectId;
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
    const id = String(form.get("id") ?? "");
    if (!id) return data(actionError(t("webhooks.errors.generic")), init);
    try {
      await webhooks.delete(id);
      return data({ ok: true }, init);
    } catch (error) {
      return data(toActionError(error, { projectId, webhookId: id }), init);
    }
  }

  if (intent === "create" || intent === "update") {
    const parsed = webhookFormSchema.safeParse({
      url: form.get("url"),
      eventTypes: form.getAll("eventTypes").map(String),
    });
    if (!parsed.success) {
      return data(actionError(t("webhooks.errors.invalid")), init);
    }

    try {
      if (intent === "create") {
        const created = await webhooks.create({
          projectId,
          url: parsed.data.url,
          eventTypes: parsed.data.eventTypes,
        });
        return data(
          { ok: true, secret: created.secretKey, webhookId: created.id },
          init,
        );
      }

      const id = String(form.get("id") ?? "");
      if (!id) return data(actionError(t("webhooks.errors.generic")), init);
      await webhooks.update(id, {
        url: parsed.data.url,
        eventTypes: parsed.data.eventTypes,
      });
      return data({ ok: true }, init);
    } catch (error) {
      return data(toActionError(error, { projectId, intent }), init);
    }
  }

  return data(actionError(t("webhooks.errors.generic")), init);
}

import { resolveProjectPrincipal } from "~/lib/.server/api/project-api";
import { toActionError } from "~/lib/.server/errors";
import { servicesContext } from "~/lib/.server/services";
import { getActiveSubscriptionInfo } from "~/lib/.server/stripe/subscription";
import { actionError } from "~/lib/action-result";
import { getServerT } from "~/lib/i18n/i18n.server";

import type { Route } from "./+types/route";

/**
 * `POST /projects/:projectId/api-keys` — the page's mutations, posted by
 * `useFetcher`. `create` mints a `pfm_live` key stamped with the API's expected
 * meta (team/user/plan) and returns its one-time secret; `rename` edits the
 * name; `delete` revokes it. `resolveProjectPrincipal` enforces team membership
 * on every intent. Recoverable failures return a toastable {@link actionError}.
 */
export async function action({ params, request, context }: Route.ActionArgs) {
  const t = await getServerT(request);
  const projectId = params.projectId;
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const { apiKeys } = context.get(servicesContext);

  // Guards team membership (403 for a non-member) + gives the creator snapshot.
  // Per-key ownership (the target key's `externalId` matching this project) is
  // enforced in the service's rename/delete via a getKey check.
  const { team, user } = await resolveProjectPrincipal(context, projectId);

  try {
    if (intent === "create") {
      const name = String(form.get("name") ?? "").trim() || undefined;
      const subscription = await getActiveSubscriptionInfo(
        team.stripeCustomerId,
      ).catch(() => ({ active: false, planMeta: {} }));
      const { secret } = await apiKeys.create({
        projectId,
        name,
        teamId: team.id,
        planMeta: subscription.planMeta,
        createdBy: { id: user.id, label: user.email },
      });
      return { ok: true, secret };
    }

    if (intent === "rename") {
      const id = String(form.get("id") ?? "");
      const name = String(form.get("name") ?? "").trim();
      if (!id || !name) return actionError(t("apiKeys.errors.generic"));
      await apiKeys.rename({ id, name, projectId });
      return { ok: true };
    }

    if (intent === "delete") {
      const id = String(form.get("id") ?? "");
      if (!id) return actionError(t("apiKeys.errors.generic"));
      await apiKeys.delete({ id, projectId });
      return { ok: true };
    }

    return actionError(t("apiKeys.errors.generic"));
  } catch (error) {
    return toActionError(error, { projectId, intent });
  }
}

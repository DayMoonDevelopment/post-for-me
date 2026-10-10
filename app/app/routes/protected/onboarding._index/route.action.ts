import { captureUserEvent } from "~/lib/.server/posthog";
import { currentUserContext, servicesContext } from "~/lib/.server/services";
import {
  isOnboardingPlatform,
  isOnboardingSegment,
  isOnboardingVolume,
  ONBOARDING_VERSION,
  parseOnboardingCredentials,
  PERSON_PROP_COMPLETED_VERSION,
  PERSON_PROP_PLATFORMS,
  PERSON_PROP_SEGMENT,
  PERSON_PROP_VOLUME,
} from "~/lib/onboarding";
import { isProjectType } from "~/lib/types/project";

import type { Route } from "./+types/route";

/** Parse the comma-joined platform ids sent with complete/skip. */
function parsePlatforms(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || raw.length === 0) return [];
  return raw.split(",").filter(isOnboardingPlatform);
}

/**
 * Records the durable onboarding OUTCOME in PostHog (backend-first, per the
 * telemetry skill — these two events are ad-blocker-proof anchors for the
 * activation funnel). Nested under `_protected`, so the auth middleware has
 * already resolved `currentUserContext` — the distinct id is the session
 * user's id.
 *
 * In-flow interaction detail (per-step navigation, per-choice selection) is
 * tracked CLIENT-side instead (see `onboarding-analytics.ts`); the server's job
 * is the end-of-flow snapshot. Completing and skipping both stamp the version
 * (so onboarding stops auto-opening) and `$set` the FINAL segment / platforms /
 * volume as the authoritative person properties — so the selections are durable
 * even if every client event was dropped. They stay DISTINCT events, though: a
 * skip must never count as a completion or the activation funnel is meaningless.
 */
export async function action({ request, context }: Route.ActionArgs) {
  const user = context.get(currentUserContext);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  // The `project` and `credentials` intents are the onboarding flow's durable
  // DB writes, committed as the user advances off those steps (not deferred to
  // the end) so the configuration survives an abandoned flow and the flow is
  // resumable. Unlike complete/skip (PostHog person properties), these mutate
  // real backend state through the entity-service ports.
  if (intent === "project") {
    const projectId = String(form.get("project_id") ?? "");
    const type = form.get("type");
    const name = String(form.get("name") ?? "").trim();
    if (!projectId || !isProjectType(type)) {
      return { ok: false };
    }
    const { projects } = context.get(servicesContext);
    await projects.update(projectId, {
      type,
      ...(name ? { name } : {}),
    });
    return { ok: true };
  }

  if (intent === "credentials") {
    const projectId = String(form.get("project_id") ?? "");
    const credentials = parseOnboardingCredentials(form.get("credentials"));
    if (!projectId || credentials.length === 0) {
      return { ok: true };
    }
    const { providerCredentials } = context.get(servicesContext);
    await providerCredentials.upsert(projectId, credentials);
    return { ok: true };
  }

  if (intent !== "complete" && intent !== "skip") {
    return { ok: false };
  }

  const segment = form.get("segment");
  const volume = form.get("volume");
  const platforms = parsePlatforms(form.get("platforms"));

  // Only write a person property when the user actually made the choice — an
  // empty/absent field on an early skip must not clobber it with a blank.
  const finalSelections = {
    [PERSON_PROP_PLATFORMS]: platforms,
    ...(isOnboardingSegment(segment) ? { [PERSON_PROP_SEGMENT]: segment } : {}),
    ...(isOnboardingVolume(volume) ? { [PERSON_PROP_VOLUME]: volume } : {}),
  };

  captureUserEvent({
    userId: user.id,
    event: intent === "complete" ? "onboarding_completed" : "onboarding_skipped",
    properties: {
      onboarding_version: ONBOARDING_VERSION,
      platforms,
      ...(isOnboardingSegment(segment) ? { segment } : {}),
      ...(isOnboardingVolume(volume) ? { volume } : {}),
      ...(intent === "skip"
        ? { last_step: Number(form.get("last_step") ?? 0) }
        : {}),
      $set: {
        [PERSON_PROP_COMPLETED_VERSION]: ONBOARDING_VERSION,
        ...finalSelections,
      },
    },
  });

  return { ok: true };
}

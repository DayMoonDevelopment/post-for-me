import { createHash } from "node:crypto";

import { PostHog } from "posthog-node";

const POST_HOG_API_KEY = process.env?.POST_HOG_API_KEY;
const POST_HOG_API_HOST = process.env?.POST_HOG_API_HOST;

let client: PostHog | null = null;

/**
 * Lazily build a singleton PostHog node client. Returns `null` when the env
 * isn't configured (e.g. local dev or before prod secrets are set), so callers
 * become no-ops rather than throwing — mirroring the browser provider guard.
 */
function getClient(): PostHog | null {
  if (!POST_HOG_API_KEY || !POST_HOG_API_HOST) {
    return null;
  }

  if (!client) {
    client = new PostHog(POST_HOG_API_KEY, {
      host: POST_HOG_API_HOST,
      // We run in short-lived server handlers (the Stripe webhook), so send
      // immediately and `await flush()` rather than relying on the background
      // batcher, which may never fire before the handler returns.
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return client;
}

/**
 * Derive a stable UUID from a key so the same logical event (e.g. a conversion
 * for a given subscription) can be emitted from more than one webhook without
 * double-counting — PostHog deduplicates ingested events by `uuid`.
 */
export function deterministicUuid(key: string): string {
  const hex = createHash("sha256").update(key).digest("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/**
 * Capture a server-side event. `teamId` / `projectId`, when provided, attach the
 * PostHog `team` / `project` groups so the event rolls up to the billing entity
 * and (for project-scoped actions) the project the user was acting on. Best-effort:
 * any failure is logged, never thrown, so analytics can't break a webhook.
 */
export async function captureServerEvent(params: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
  teamId?: string;
  /**
   * Attaches the PostHog `project` group. Set on project-scoped events so they
   * roll up to the project a user is acting on behalf of (one project at a time).
   */
  projectId?: string;
  dedupeKey?: string;
  /**
   * When the event actually occurred. Pass the source system's timestamp (e.g.
   * the Stripe event's `created`) so retries/resends don't get stamped at
   * ingestion time. Defaults to now when omitted.
   */
  timestamp?: Date;
}): Promise<void> {
  const posthog = getClient();
  if (!posthog) {
    return;
  }

  const groups: Record<string, string> = {};
  if (params.teamId) groups.team = params.teamId;
  if (params.projectId) groups.project = params.projectId;

  try {
    posthog.capture({
      distinctId: params.distinctId,
      event: params.event,
      properties: params.properties,
      groups: Object.keys(groups).length > 0 ? groups : undefined,
      uuid: params.dedupeKey,
      timestamp: params.timestamp,
    });
    await posthog.flush();
  } catch (error) {
    console.error(`Failed to capture PostHog event "${params.event}":`, error);
  }
}

/**
 * Set/refresh properties on a `team` group. We keep current subscription state
 * (status, plan, is_active, …) on the group so "is this team active?" is a
 * self-healing property rather than something reconstructed from event history.
 */
export async function setTeamGroupProperties(
  teamId: string,
  properties: Record<string, unknown>,
): Promise<void> {
  const posthog = getClient();
  if (!posthog) {
    return;
  }

  try {
    posthog.groupIdentify({
      groupType: "team",
      groupKey: teamId,
      properties,
    });
    await posthog.flush();
  } catch (error) {
    console.error("Failed to set PostHog team group properties:", error);
  }
}

/**
 * Set/refresh properties on a `project` group. `groupIdentify` merges (rather
 * than replaces) properties, so partial updates are safe. Best-effort.
 */
export async function setProjectGroupProperties(
  projectId: string,
  properties: Record<string, unknown>,
): Promise<void> {
  const posthog = getClient();
  if (!posthog) {
    return;
  }

  try {
    posthog.groupIdentify({
      groupType: "project",
      groupKey: projectId,
      properties,
    });
    await posthog.flush();
  } catch (error) {
    console.error("Failed to set PostHog project group properties:", error);
  }
}

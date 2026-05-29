import { createHash } from "crypto";

import { PostHog } from "posthog-node";

// Vendored copy of the dashboard's server-side PostHog helper. Per the
// dumb-monorepo rule, siblings don't share code — keep this in sync with
// dashboard/app/lib/.server/posthog.ts by hand if the shape changes.

const POST_HOG_API_KEY = process.env?.POST_HOG_API_KEY;
const POST_HOG_API_HOST = process.env?.POST_HOG_API_HOST;

let client: PostHog | null = null;

/**
 * Lazily build a singleton PostHog node client. Returns `null` when the env
 * isn't configured, so callers become no-ops rather than throwing.
 */
function getClient(): PostHog | null {
  if (!POST_HOG_API_KEY || !POST_HOG_API_HOST) {
    return null;
  }

  if (!client) {
    client = new PostHog(POST_HOG_API_KEY, {
      host: POST_HOG_API_HOST,
      // Send immediately and await flush — Trigger tasks finish and tear down,
      // so we don't want events stuck in the background batcher.
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return client;
}

/**
 * Derive a stable UUID from a key so a re-run of the cron can't double-count the
 * same logical event — PostHog deduplicates ingested events by `uuid`.
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
 * Capture a server-side event attributed to a `team` group. Best-effort: any
 * failure is logged, never thrown, so analytics can't break the cron.
 */
export async function captureServerEvent(params: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
  teamId?: string;
  dedupeKey?: string;
  /** When the event occurred; defaults to now. */
  timestamp?: Date;
}): Promise<void> {
  const posthog = getClient();
  if (!posthog) {
    return;
  }

  try {
    posthog.capture({
      distinctId: params.distinctId,
      event: params.event,
      properties: params.properties,
      groups: params.teamId ? { team: params.teamId } : undefined,
      uuid: params.dedupeKey,
      timestamp: params.timestamp,
    });
    await posthog.flush();
  } catch (error) {
    console.error(`Failed to capture PostHog event "${params.event}":`, error);
  }
}

import { Unkey } from "@unkey/api";

import { InternalException } from "~/lib/.server/errors";

// One Unkey API namespace holds every project's keys, partitioned by
// `externalId = projectId`. The root key is server-only (never bundled).
const UNKEY_ROOT_KEY = process.env.UNKEY_ROOT_KEY;
const UNKEY_API_ID = process.env.UNKEY_API_ID;

/** Prefixes partition the shared namespace by lifetime/ownership:
 * - `pfm_tmp` — short-lived dashboard keys minted to call the API as the user.
 * - `pfm_live` — the user's own long-lived API keys (the API Keys page). */
export const TEMPORARY_KEY_PREFIX = "pfm_tmp";
export const LIVE_KEY_PREFIX = "pfm_live";
export const TEMPORARY_KEY_NAME = "TMP API Key";

/** Per-key rate limits applied to every minted key (mirrors the old dashboard):
 * 5/sec + 40/min, auto-applied by Unkey on verify. */
export const KEY_RATE_LIMITS = [
  { name: "per_minute_use", limit: 40, duration: 60_000, autoApply: true },
  { name: "per_second_use", limit: 5, duration: 1_000, autoApply: true },
];

/** True when the Unkey env is provisioned (used to degrade gracefully). */
export function unkeyConfigured(): boolean {
  return Boolean(UNKEY_ROOT_KEY && UNKEY_API_ID);
}

/** A configured client + the namespace id, or a clear failure if the env isn't
 * provisioned. Constructed lazily so registration never requires the config. */
export function requireUnkey(): { apiId: string; unkey: Unkey } {
  if (!UNKEY_ROOT_KEY || !UNKEY_API_ID) {
    throw new InternalException("API keys aren't available right now.", {
      message: "Unkey is not configured — set UNKEY_ROOT_KEY and UNKEY_API_ID.",
      context: { provider: "unkey" },
    });
  }
  return { unkey: new Unkey({ rootKey: UNKEY_ROOT_KEY }), apiId: UNKEY_API_ID };
}

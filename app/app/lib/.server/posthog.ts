import { PostHog } from "posthog-node";

let client: PostHog | undefined;

/**
 * Server-side PostHog client (singleton). Returns undefined when no key is
 * configured so callers can no-op in local dev.
 */
export function getPostHogServer() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!client && key) {
    client = new PostHog(key, {
      host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
    });
  }
  return client;
}

/**
 * Junk values that would merge unrelated users into one PostHog person if
 * they ever reached capture() as a distinct_id (PostHog warns collisions are
 * irreversible). A buggy `String(user?.id)` produces exactly these.
 */
const INVALID_DISTINCT_IDS = new Set([
  "",
  "null",
  "undefined",
  "true",
  "false",
  "[object Object]",
  "NaN",
]);

/**
 * Capture a server-side event for an authenticated user.
 *
 * `userId` MUST be the session user's stable database id (the Supabase auth
 * user id once auth lands) — the exact id the client passes to
 * posthog.identify() on login. That match is what links server events to the
 * person's client-side history; email or any mutable value is forbidden.
 *
 * No-ops (with a warning) on junk ids rather than risking a person-merge,
 * and never throws — analytics must not break the surrounding action.
 */
export function captureUserEvent({
  userId,
  event,
  properties,
}: {
  event: string;
  properties?: Record<string, unknown>;
  userId: string;
}) {
  if (INVALID_DISTINCT_IDS.has(userId.trim())) {
    console.warn(
      `[posthog] dropped "${event}": invalid distinct id "${userId}"`,
    );
    return;
  }

  return getPostHogServer()?.capture({ distinctId: userId, event, properties });
}

/**
 * Evaluate a feature flag for an authenticated user, server-side.
 *
 * We resolve onboarding's `show_onboarding` flag here (in the loader) rather
 * than from posthog-js in the browser specifically so ad blockers can't
 * suppress it: the decision is made server-to-server and handed to the client
 * as loader data, which also removes the first-paint flash.
 *
 * Returns false when PostHog is unconfigured, the id is junk, or the flag
 * doesn't resolve — never throws, so a flag check can't break the request.
 */
export async function isFeatureEnabledForUser({
  userId,
  flag,
}: {
  flag: string;
  userId: string;
}): Promise<boolean> {
  const server = getPostHogServer();
  if (!server || INVALID_DISTINCT_IDS.has(userId.trim())) return false;

  try {
    // Evaluate just this flag in one `/flags` request (the non-deprecated API).
    const flags = await server.evaluateFlags(userId, { flagKeys: [flag] });
    return flags.isEnabled(flag) ?? false;
  } catch (error) {
    console.warn(`[posthog] feature flag "${flag}" check failed:`, error);
    return false;
  }
}

/**
 * Rare case: a server-side event with no authenticated user (e.g. a public
 * endpoint hit). Uses a unique throwaway id — never a shared sentinel, which
 * would merge all anonymous traffic into one person — and skips person
 * profile creation so these don't pile up as ghost persons.
 */
export function captureAnonymousEvent({
  event,
  properties,
}: {
  event: string;
  properties?: Record<string, unknown>;
}) {
  getPostHogServer()?.capture({
    distinctId: `anon:${crypto.randomUUID()}`,
    event,
    properties: { ...properties, $process_person_profile: false },
  });
}

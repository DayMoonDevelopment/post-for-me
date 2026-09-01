import { PostHog } from 'posthog-node';

let client: PostHog | null = null;

function getClient(): PostHog | null {
  const apiKey = process.env?.POST_HOG_API_KEY;
  const apiHost = process.env?.POST_HOG_API_HOST;

  if (!apiKey || !apiHost) {
    return null;
  }

  if (!client) {
    client = new PostHog(apiKey, {
      host: apiHost,
      // Short-lived request handlers — flush immediately rather than relying on
      // the background batcher, which may never fire before the handler returns.
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return client;
}

const R2_FLAG_CACHE_TTL_MS = 60_000;
const r2FlagCache = new Map<string, { value: boolean; expiresAt: number }>();

/**
 * Evaluate the `r2-storage` PostHog feature flag for a team (and, when known,
 * project) group. Returns `false` when PostHog is unconfigured or the flag
 * evaluation fails — the Supabase provider is always the safe fallback.
 *
 * Cached per team/project for R2_FLAG_CACHE_TTL_MS — callers on a hot path
 * (e.g. one check per TUS chunk request) would otherwise do a live PostHog
 * round-trip on every call.
 */
export async function isR2StorageEnabled(
  teamId: string,
  projectId?: string,
): Promise<boolean> {
  if (!teamId) return false;

  const cacheKey = `${teamId}:${projectId ?? ''}`;
  const cached = r2FlagCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }

  const posthog = getClient();
  if (!posthog) return false;

  let value: boolean;
  try {
    const result = await posthog.isFeatureEnabled('r2-storage', teamId, {
      groups: {
        team: teamId,
        ...(projectId && { project: projectId }),
      },
    });
    value = result ?? false;
  } catch {
    value = false;
  }

  r2FlagCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + R2_FLAG_CACHE_TTL_MS,
  });
  return value;
}

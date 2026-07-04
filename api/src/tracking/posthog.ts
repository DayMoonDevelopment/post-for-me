import { PostHog } from 'posthog-node';

const POST_HOG_API_KEY = process.env?.POST_HOG_API_KEY;
const POST_HOG_API_HOST = process.env?.POST_HOG_API_HOST;

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!POST_HOG_API_KEY || !POST_HOG_API_HOST) {
    return null;
  }

  if (!client) {
    client = new PostHog(POST_HOG_API_KEY, {
      host: POST_HOG_API_HOST,
      // Short-lived request handlers — flush immediately rather than relying on
      // the background batcher, which may never fire before the handler returns.
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return client;
}

/**
 * Evaluate the `r2-storage` PostHog feature flag for a team group. Returns
 * `false` when PostHog is unconfigured or the flag evaluation fails — the
 * Supabase provider is always the safe fallback.
 */
export async function isR2StorageEnabled(teamId: string): Promise<boolean> {
  const posthog = getClient();
  if (!posthog || !teamId) return false;
  try {
    return (
      (await posthog.isFeatureEnabled('r2-storage', teamId, {
        groups: { team: teamId },
      })) ?? false
    );
  } catch {
    return false;
  }
}

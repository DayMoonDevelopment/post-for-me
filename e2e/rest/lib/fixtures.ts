import { api, V1, expectStatus } from './http';
import type { SocialAccount } from './types';

/**
 * Stable `user_id` for the shared dummy social account used as a fixture by
 * suites that need an account to exist (social posts, account feeds).
 *
 * The create endpoint upserts on `(provider, project_id, social_provider_user_id)`,
 * so re-running the suite reuses the same row instead of accumulating cruft.
 */
export const FIXTURE_ACCOUNT_USER_ID = 'pfm-integration-fixture';

/**
 * Creates (or upserts) a real `social_provider_connections` row in the demo
 * project via the public `POST /v1/social-accounts` endpoint.
 *
 * The account carries obviously-fake credentials and is NEVER used to actually
 * publish anything — it just satisfies the API's ownership checks so that
 * dependent endpoints (create post, account feed, ...) can be exercised.
 */
export async function createTestSocialAccount(
  opts: { userId?: string; platform?: string; externalId?: string | null } = {},
): Promise<SocialAccount> {
  const userId = opts.userId ?? FIXTURE_ACCOUNT_USER_ID;
  const platform = opts.platform ?? 'bluesky';

  const res = await api.post<SocialAccount>(`${V1}/social-accounts`, {
    platform,
    user_id: userId,
    username: 'pfm-integration-test',
    external_id: opts.externalId ?? null,
    access_token: 'pfm-integration-test-token',
    refresh_token: null,
    access_token_expires_at: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    refresh_token_expires_at: null,
    metadata: null,
  });

  expectStatus(res, 200, 201);
  return res.body;
}

/** A caption used for every post/preview created by the suite, so the demo
 * project's data is easy to recognise and clean up by hand if ever needed. */
export const TEST_CAPTION =
  'Post for Me integration test — automated, safe to ignore/delete.';

/** Generates a unique-ish external id for a single test run. */
export function testExternalId(label: string): string {
  return `pfm-int-${label}-${Date.now()}`;
}

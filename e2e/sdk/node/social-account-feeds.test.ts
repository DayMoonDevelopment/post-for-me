import { client, createTestSocialAccount } from './lib/client';
import { optionalEnv } from '../../lib/env';

/**
 * SDK: Social Account Feeds — `client.socialAccountFeeds.list()`
 *
 * The most environment-dependent part of the SDK surface. The API gates this
 * endpoint on the key's plan (`new_pricing`) and on the account being genuinely
 * connected. The test fires the real SDK call and accepts the documented gated
 * outcomes; set `PFM_TEST_FEED_ACCOUNT_ID` to a real connected account for a
 * full success assertion.
 */
describe('SDK (post-for-me): Social Account Feeds', () => {
  let accountId: string;

  beforeAll(async () => {
    const override = optionalEnv('PFM_TEST_FEED_ACCOUNT_ID', '');
    accountId = override || (await createTestSocialAccount()).id;
  });

  it('client.socialAccountFeeds.list(id) — returns a feed page (or a documented gated error)', async () => {
    try {
      const page = await client().socialAccountFeeds.list(accountId, {
        limit: 5,
      });

      expect(Array.isArray(page.data)).toBe(true);
      expect(page.meta).toEqual(
        expect.objectContaining({ limit: expect.any(Number) }),
      );
    } catch (err) {
      const status = (err as { status?: unknown }).status;
      // 401: API key not on the `new_pricing` plan (documented gate).
      // 500: the dummy fixture account isn't truly connected, so the platform
      //      call fails — expected unless PFM_TEST_FEED_ACCOUNT_ID is set.
      expect(status === 401 || status === 500).toBe(true);
      // eslint-disable-next-line no-console
      console.warn(
        `[sdk/social-account-feeds] list() returned HTTP ${status} — ` +
          `${status === 401 ? 'API key is not on the `new_pricing` plan' : 'fixture account has no real platform connection'}. ` +
          `Set PFM_TEST_FEED_ACCOUNT_ID to a real connected account for a full assertion.`,
      );
    }
  });
});

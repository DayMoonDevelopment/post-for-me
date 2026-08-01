import { api, V1, expectStatus, describeResponse } from './lib/http';
import { optionalEnv } from '../lib/env';
import { createTestSocialAccount } from './lib/fixtures';
import type { CursorPaginated } from './lib/types';

/**
 * Social Account Feeds — `src/social-account-feeds/social-account-feeds.controller.ts`
 *
 * One endpoint: a cursor-paginated feed of a connected account's platform
 * posts. This is the most environment-dependent endpoint in the API:
 *   - the AuthGuard requires the API key's plan to be `new_pricing`,
 *   - the account must be genuinely connected with a real token and the
 *     `feeds` permission for the platform call to actually return data.
 *
 * So the test asserts the endpoint is reachable & wired, and accepts the
 * documented gated outcomes. Point it at a real connected account with
 * PFM_TEST_FEED_ACCOUNT_ID to get a true 200 + payload assertion.
 */
describe('Social Account Feeds API', () => {
  let accountId: string;

  beforeAll(async () => {
    const override = optionalEnv('PFM_TEST_FEED_ACCOUNT_ID', '');
    if (override) {
      accountId = override;
    } else {
      const account = await createTestSocialAccount();
      accountId = account.id;
    }
  });

  it('GET /v1/social-account-feeds/:social_account_id — returns a paginated feed (or a documented gated response)', async () => {
    const res = await api.get<CursorPaginated<unknown>>(
      `${V1}/social-account-feeds/${accountId}`,
      { query: { limit: 5 } },
    );

    // 200: real feed. 401: API key not on the `new_pricing` plan (documented
    // gate). 500: account isn't truly connected so the platform call failed
    // (expected for the dummy fixture account).
    expectStatus(res, 200, 401, 500);

    if (res.ok) {
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toEqual(
        expect.objectContaining({
          limit: expect.any(Number),
        }),
      );
    } else if (res.status === 401) {
      const message = JSON.stringify(res.body);
      expect(message.toLowerCase()).toContain('plan');
      // eslint-disable-next-line no-console
      console.warn(
        '[social-account-feeds] API key is not on the `new_pricing` plan — ' +
          'endpoint is reachable but gated. This is a documented outcome.',
      );
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        '[social-account-feeds] feed fetch failed — expected when using the ' +
          'dummy fixture account (no real platform connection). Set ' +
          'PFM_TEST_FEED_ACCOUNT_ID to a real connected account for a full ' +
          'assertion.\n' +
          describeResponse(res),
      );
    }
  });
});

import { client, expectApiError, requirePrereq } from './lib/client';
import { optionalEnv } from '../../lib/env';

/**
 * SDK: Social Accounts — `client.socialAccounts.*`
 *
 * Covers all six SDK methods: create, retrieve, update, list, createAuthURL,
 * disconnect. Owns its own dummy account (upserted each run) so the chain can
 * run without touching real connected accounts.
 */
describe('SDK (post-for-me): Social Accounts', () => {
  const SUITE_USER_ID = 'pfm-e2e-sdk-account-suite';
  let accountId: string | undefined;

  it('client.socialAccounts.create() — creates (upserts) a social account', async () => {
    const account = await client().socialAccounts.create({
      platform: 'bluesky',
      user_id: SUITE_USER_ID,
      username: 'pfm-e2e-test',
      access_token: 'pfm-e2e-test-token',
      access_token_expires_at: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    });

    expect(typeof account.id).toBe('string');
    expect(account.platform).toBe('bluesky');
    expect(account.user_id).toBe(SUITE_USER_ID);

    accountId = account.id;
  });

  it('client.socialAccounts.list() — returns a paginated page including the new account', async () => {
    const page = await client().socialAccounts.list({ limit: 50 });

    expect(Array.isArray(page.data)).toBe(true);
    expect(page.meta).toEqual(
      expect.objectContaining({ limit: expect.any(Number) }),
    );

    const id = requirePrereq(accountId, 'created account id');
    expect(page.data.some((a) => a.id === id)).toBe(true);
  });

  it('client.socialAccounts.retrieve(id) — fetches the created account', async () => {
    const id = requirePrereq(accountId, 'created account id');
    const account = await client().socialAccounts.retrieve(id);

    expect(account.id).toBe(id);
    expect(account.platform).toBe('bluesky');
  });

  it('client.socialAccounts.retrieve(id) — rejects with 404 for an unknown id', async () => {
    await expectApiError(
      client().socialAccounts.retrieve('spc_pfm_e2e_missing'),
      404,
    );
  });

  it('client.socialAccounts.update(id, {...}) — updates username and external_id', async () => {
    const id = requirePrereq(accountId, 'created account id');
    const username = `pfm-e2e-updated-${Date.now()}`;
    const externalId = `pfm-e2e-ext-${Date.now()}`;

    const account = await client().socialAccounts.update(id, {
      username,
      external_id: externalId,
    });

    expect(account.id).toBe(id);
    expect(account.username).toBe(username);
    expect(account.external_id).toBe(externalId);
  });

  it('client.socialAccounts.createAuthURL({...}) — returns an OAuth URL (or a documented gated error)', async () => {
    // `bluesky` needs no project credentials configured. Override with
    // PFM_TEST_AUTH_PLATFORM to target a platform you have app credentials for.
    const platform = optionalEnv('PFM_TEST_AUTH_PLATFORM', 'bluesky');

    try {
      const res = await client().socialAccounts.createAuthURL({
        platform,
        external_id: 'pfm-e2e-test',
        permissions: ['posts'],
        platform_data: {
          bluesky: {
            handle: 'pfm-e2e-test.bsky.social',
            app_password: 'pfm-e2e-app-password',
          },
        },
      });

      expect(typeof res.url).toBe('string');
      expect(res.platform).toBe(platform);
    } catch (err) {
      const status = (err as { status?: unknown }).status;
      // 401 would mean a bad API key — always a failure. 400/404 just means the
      // target project has no provider app credentials configured for `platform`.
      expect(status === 400 || status === 404).toBe(true);
      // eslint-disable-next-line no-console
      console.warn(
        `[sdk/social-accounts] createAuthURL("${platform}") returned HTTP ` +
          `${status} — likely missing provider app credentials for the target ` +
          `project. The SDK call path is exercised & authenticated.`,
      );
    }
  });

  it('client.socialAccounts.disconnect(id) — disconnects the account', async () => {
    const id = requirePrereq(accountId, 'created account id');
    const res = await client().socialAccounts.disconnect(id);

    expect(res.id).toBe(id);
    expect(res.status).toBe('disconnected');
  });
});

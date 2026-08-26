import { api, V1, expectStatus, requirePrereq, describeResponse } from './lib/http';
import { optionalEnv } from '../lib/env';
import type {
  ApiError,
  AuthUrlResponse,
  Paginated,
  SocialAccount,
} from './lib/types';

/**
 * Social Accounts — `src/social-provider-connections/social-provider-connections.controller.ts`
 *
 * Exercises all six endpoints. The suite owns its own dummy account
 * (`pfm-integration-account-suite`, upserted on each run) so create -> get ->
 * update -> disconnect can chain without touching real connected accounts.
 */
describe('Social Accounts API', () => {
  const SUITE_USER_ID = 'pfm-integration-account-suite';
  let accountId: string | undefined;

  it('POST /v1/social-accounts — creates (upserts) a social account', async () => {
    const res = await api.post<SocialAccount>(`${V1}/social-accounts`, {
      platform: 'bluesky',
      user_id: SUITE_USER_ID,
      username: 'pfm-integration-test',
      external_id: null,
      access_token: 'pfm-integration-test-token',
      refresh_token: null,
      access_token_expires_at: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      refresh_token_expires_at: null,
      metadata: null,
    });

    expectStatus(res, 200, 201);
    expect(typeof res.body.id).toBe('string');
    expect(res.body.platform).toBe('bluesky');
    expect(res.body.user_id).toBe(SUITE_USER_ID);

    accountId = res.body.id;
  });

  it('GET /v1/social-accounts — lists social accounts (paginated)', async () => {
    const res = await api.get<Paginated<SocialAccount>>(
      `${V1}/social-accounts`,
      { query: { limit: 50 } },
    );

    expectStatus(res, 200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        offset: expect.any(Number),
        limit: expect.any(Number),
      }),
    );

    // The account created above should be discoverable in the project.
    const id = requirePrereq(accountId, 'created account id');
    const found = res.body.data.some((a) => a.id === id);
    expect(found).toBe(true);
  });

  it('GET /v1/social-accounts/:id — fetches the created account', async () => {
    const id = requirePrereq(accountId, 'created account id');
    const res = await api.get<SocialAccount>(`${V1}/social-accounts/${id}`);

    expectStatus(res, 200);
    expect(res.body.id).toBe(id);
    expect(res.body.platform).toBe('bluesky');
  });

  it('GET /v1/social-accounts/:id — returns 404 for an unknown id', async () => {
    const res = await api.get(
      `${V1}/social-accounts/spc_pfm_integration_missing`,
    );

    expectStatus(res, 404);
  });

  it('PATCH /v1/social-accounts/:id — updates username and external_id', async () => {
    const id = requirePrereq(accountId, 'created account id');
    const newUsername = `pfm-int-updated-${Date.now()}`;
    const newExternalId = `pfm-int-ext-${Date.now()}`;

    const res = await api.patch<SocialAccount>(`${V1}/social-accounts/${id}`, {
      username: newUsername,
      external_id: newExternalId,
    });

    expectStatus(res, 200);
    expect(res.body.id).toBe(id);
    expect(res.body.username).toBe(newUsername);
    expect(res.body.external_id).toBe(newExternalId);
  });

  it('POST /v1/social-accounts/auth-url — returns an OAuth URL for the platform', async () => {
    // `bluesky` needs no project credentials configured, so it is the default
    // target. Override with PFM_TEST_AUTH_PLATFORM to test a platform you have
    // app credentials configured for.
    const platform = optionalEnv('PFM_TEST_AUTH_PLATFORM', 'bluesky');

    const res = await api.post<AuthUrlResponse & ApiError>(
      `${V1}/social-accounts/auth-url`,
      {
        platform,
        platform_data: {
          bluesky: {
            handle: 'pfm-integration-test.bsky.social',
            app_password: 'pfm-int-app-password',
          },
        },
        external_id: 'pfm-integration-test',
        permissions: ['posts'],
      },
    );

    // 200/201: URL generated. 400/404: platform credentials not configured for
    // this project (a documented, environment-dependent outcome). 401 here
    // would mean the API key itself is bad — that is always a failure.
    expect(res.status).not.toBe(401);
    expectStatus(res, 200, 201, 400, 404);

    if (res.ok) {
      expect(typeof res.body.url).toBe('string');
      expect(res.body.platform).toBe(platform);
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        `[social-accounts] auth-url for "${platform}" returned a non-2xx ` +
          `response — likely missing provider app credentials for the demo ` +
          `project. Endpoint is reachable & authenticated.\n` +
          describeResponse(res),
      );
    }
  });

  it('POST /v1/social-accounts/:id/disconnect — disconnects the account', async () => {
    const id = requirePrereq(accountId, 'created account id');
    const res = await api.post<SocialAccount>(
      `${V1}/social-accounts/${id}/disconnect`,
    );

    expectStatus(res, 200, 201);
    expect(res.body.id).toBe(id);
    expect(res.body.status).toBe('disconnected');
  });
});

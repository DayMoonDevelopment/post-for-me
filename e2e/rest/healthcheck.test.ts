import { api, expectStatus } from './lib/http';

/**
 * Healthcheck — `src/healthcheck/healthcheck.controller.ts`
 *
 * Version-neutral route (no `/v1` prefix), no authentication. Verifies the API
 * process is up AND its database connection is healthy.
 */
describe('Healthcheck API', () => {
  it('GET /healthcheck — reports the service as healthy', async () => {
    const res = await api.get<{ status: string }>('/healthcheck', {
      auth: false,
    });

    expectStatus(res, 200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

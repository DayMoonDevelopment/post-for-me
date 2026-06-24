import { api, V1, expectStatus } from './lib/http';
import type { Paginated, SocialPostResult } from './lib/types';

/**
 * Social Post Results — `src/social-post-results/social-post-results.controller.ts`
 *
 * Read-only: list + get-by-id. Post results are produced asynchronously when
 * real posts are published, so this suite can't create one itself — it lists
 * whatever exists in the demo project and fetches the first one if present.
 */
describe('Social Post Results API', () => {
  let firstResultId: string | undefined;

  it('GET /v1/social-post-results — lists post results (paginated)', async () => {
    const res = await api.get<Paginated<SocialPostResult>>(
      `${V1}/social-post-results`,
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

    firstResultId = res.body.data[0]?.id;
  });

  it('GET /v1/social-post-results/:id — fetches a result if one exists, else 404s on an unknown id', async () => {
    if (firstResultId) {
      const res = await api.get<SocialPostResult>(
        `${V1}/social-post-results/${firstResultId}`,
      );
      expectStatus(res, 200);
      expect(res.body.id).toBe(firstResultId);
    } else {
      // No results in the demo project — still exercise the route + its
      // documented 404 path so the endpoint is genuinely covered.
      // eslint-disable-next-line no-console
      console.warn(
        '[social-post-results] no results in the demo project; ' +
          'exercising the 404 path instead of a real fetch.',
      );
      const res = await api.get(
        `${V1}/social-post-results/spr_pfm_integration_missing`,
      );
      expectStatus(res, 404);
    }
  });
});

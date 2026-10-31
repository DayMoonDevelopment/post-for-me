import { client, expectApiError } from './lib/client';

/**
 * SDK: Social Post Results — `client.socialPostResults.*`
 *
 * Read-only: list + retrieve. Results are produced asynchronously when real
 * posts publish, so this suite lists whatever exists and retrieves the first
 * one if present, otherwise exercises the SDK's documented 404 path.
 */
describe('SDK (post-for-me): Social Post Results', () => {
  let firstResultId: string | undefined;

  it('client.socialPostResults.list() — returns a paginated page', async () => {
    const page = await client().socialPostResults.list({ limit: 50 });

    expect(Array.isArray(page.data)).toBe(true);
    expect(page.meta).toEqual(
      expect.objectContaining({ limit: expect.any(Number) }),
    );

    firstResultId = page.data[0]?.id;
  });

  it('client.socialPostResults.retrieve(id) — fetches a result if one exists, else rejects 404 on an unknown id', async () => {
    if (firstResultId) {
      const result = await client().socialPostResults.retrieve(firstResultId);
      expect(result.id).toBe(firstResultId);
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        '[sdk/social-post-results] no results in the target project; ' +
          'exercising the 404 path instead of a real retrieve.',
      );
      await expectApiError(
        client().socialPostResults.retrieve('spr_pfm_e2e_missing'),
        404,
      );
    }
  });
});

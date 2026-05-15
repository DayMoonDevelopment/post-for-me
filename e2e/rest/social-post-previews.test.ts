import { api, V1, expectStatus } from './lib/http';
import { TEST_CAPTION } from './lib/fixtures';

/**
 * Social Post Previews — `src/social-posts-previews/social-posts-previews.controller.ts`
 *
 * A single, UNAUTHENTICATED endpoint. It renders how a caption/media would
 * look per platform without persisting anything, and accepts arbitrary
 * (non-connected) account ids — so this suite needs no fixtures.
 */
describe('Social Post Previews API', () => {
  it('POST /v1/social-post-previews — generates per-account previews', async () => {
    const res = await api.post<unknown[]>(
      `${V1}/social-post-previews`,
      {
        caption: TEST_CAPTION,
        preview_social_accounts: [
          { id: 'spc_pfm_preview_x', platform: 'x', username: 'pfm_integration' },
          {
            id: 'spc_pfm_preview_ig',
            platform: 'instagram',
            username: 'pfm_integration',
          },
        ],
        media: null,
      },
      // Endpoint is public — prove it works with no Authorization header.
      { auth: false },
    );

    expectStatus(res, 200, 201);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    for (const preview of res.body) {
      expect(typeof preview).toBe('object');
      expect(preview).not.toBeNull();
    }
  });

  it('POST /v1/social-post-previews — 400 when preview_social_accounts is missing', async () => {
    const res = await api.post(
      `${V1}/social-post-previews`,
      { caption: TEST_CAPTION, media: null },
      { auth: false },
    );

    expectStatus(res, 400);
  });
});

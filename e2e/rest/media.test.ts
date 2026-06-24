import { api, V1, expectStatus } from './lib/http';
import type { UploadUrl } from './lib/types';

/**
 * Media — `src/media/media.controller.ts`
 *
 * One endpoint: mints a signed upload URL plus the eventual public media URL.
 * Protected by the Unkey API-key guard.
 */
describe('Media API', () => {
  it('POST /v1/media/create-upload-url — returns a signed upload URL and a public media URL', async () => {
    const res = await api.post<UploadUrl>(`${V1}/media/create-upload-url`);

    expectStatus(res, 200, 201);
    expect(typeof res.body.upload_url).toBe('string');
    expect(res.body.upload_url).toMatch(/^https?:\/\//);
    expect(typeof res.body.media_url).toBe('string');
    expect(res.body.media_url).toMatch(/^https?:\/\//);
  });

  it('POST /v1/media/create-upload-url — rejects an unauthenticated request with 401', async () => {
    const res = await api.post(`${V1}/media/create-upload-url`, undefined, {
      auth: false,
    });

    expectStatus(res, 401);
  });
});

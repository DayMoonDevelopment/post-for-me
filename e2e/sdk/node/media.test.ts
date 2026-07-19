import { client } from './lib/client';

/**
 * SDK: Media — `client.media.createUploadURL()`
 *
 * Exercises the `media` resource of the published `post-for-me` npm client
 * against the real API.
 */
describe('SDK (post-for-me): Media', () => {
  it('client.media.createUploadURL() — returns a signed upload URL and a public media URL', async () => {
    const res = await client().media.createUploadURL();

    expect(typeof res.upload_url).toBe('string');
    expect(res.upload_url).toMatch(/^https?:\/\//);
    expect(typeof res.media_url).toBe('string');
    expect(res.media_url).toMatch(/^https?:\/\//);
  });
});

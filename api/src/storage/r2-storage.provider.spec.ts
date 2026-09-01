import { R2StorageProvider } from './r2-storage.provider';

describe('R2StorageProvider.getPublicUrl', () => {
  const originalEnv = { ...process.env };

  beforeAll(() => {
    process.env.R2_ENDPOINT = 'https://example.r2.cloudflarestorage.com';
    process.env.R2_ACCESS_KEY_ID = 'test-access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.R2_PUBLIC_URL = 'https://media.example.com';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('includes the bucket in the returned URL', () => {
    const provider = new R2StorageProvider();

    expect(
      provider.getPublicUrl('social-account-photos', 'projects/1/a.jpg'),
    ).toBe('https://media.example.com/social-account-photos/projects/1/a.jpg');
  });

  it('produces different URLs for the same key in different buckets', () => {
    const provider = new R2StorageProvider();

    const mediaUrl = provider.getPublicUrl('post-media', 'key.mp4');
    const photoUrl = provider.getPublicUrl('social-account-photos', 'key.mp4');

    expect(mediaUrl).not.toBe(photoUrl);
  });
});

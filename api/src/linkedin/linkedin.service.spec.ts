import type { ConfigService } from '@nestjs/config';
import { LinkedInService } from './linkedin.service';
import type { SupabaseService } from '../supabase/supabase.service';

type ResolvePostedAt = (post: {
  publishedAt?: unknown;
  createdAt?: unknown;
}) => string | undefined;

describe('LinkedInService#resolvePostedAt', () => {
  const service = new LinkedInService(
    {} as SupabaseService,
    { get: () => undefined } as unknown as ConfigService,
  );
  const resolvePostedAt = (
    service as unknown as { resolvePostedAt: ResolvePostedAt }
  ).resolvePostedAt.bind(service);

  it('prefers publishedAt when present', () => {
    expect(
      resolvePostedAt({ publishedAt: 1634790968774, createdAt: 1634790968743 }),
    ).toBe(new Date(1634790968774).toISOString());
  });

  it('falls back to createdAt when publishedAt is absent', () => {
    expect(resolvePostedAt({ createdAt: 1634790968743 })).toBe(
      new Date(1634790968743).toISOString(),
    );
  });

  it('returns undefined when neither field is present', () => {
    expect(resolvePostedAt({})).toBeUndefined();
  });

  it('falls back to createdAt when publishedAt is not a number', () => {
    expect(
      resolvePostedAt({
        publishedAt: 'not-a-number',
        createdAt: 1634790968743,
      }),
    ).toBe(new Date(1634790968743).toISOString());
  });
});

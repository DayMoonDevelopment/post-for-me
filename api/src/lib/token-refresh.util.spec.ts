import { describe, expect, it } from 'vitest';
import { shouldRefreshToken } from './token-refresh.util';

const now = new Date('2026-11-19T12:00:00Z');
const account = {
  provider: 'x' as const,
  social_provider_metadata: { connection_type: 'oauth2' },
  access_token_expires_at: null,
};

describe('shouldRefreshToken', () => {
  it('refreshes X OAuth2 within five minutes of expiry', () => {
    for (const minutes of [-1, 0, 5, 6, 120]) {
      expect(
        shouldRefreshToken(
          {
            ...account,
            access_token_expires_at: new Date(now.getTime() + minutes * 60_000),
          },
          now,
        ),
      ).toBe(minutes <= 5);
    }
  });

  it('accepts serialized expiry dates', () => {
    expect(
      shouldRefreshToken(
        {
          ...account,
          access_token_expires_at: '2026-11-19T14:00:00Z',
        },
        now,
      ),
    ).toBe(false);
  });

  it('refreshes accounts with no expiry', () => {
    expect(shouldRefreshToken(account, now)).toBe(true);
    expect(shouldRefreshToken({ ...account, provider: 'instagram' }, now)).toBe(
      true,
    );
  });

  it('always refreshes YouTube and Bluesky', () => {
    for (const provider of ['youtube', 'bluesky'] as const) {
      expect(
        shouldRefreshToken(
          {
            ...account,
            provider,
            access_token_expires_at: '2099-01-01',
          },
          now,
        ),
      ).toBe(true);
    }
  });

  it('preserves the seven-day window for other connections', () => {
    for (const provider of ['instagram', 'x'] as const) {
      for (const days of [2, 7, 9, 30]) {
        expect(
          shouldRefreshToken(
            {
              ...account,
              provider,
              social_provider_metadata: null,
              access_token_expires_at: new Date(
                now.getTime() + days * 86400_000,
              ),
            },
            now,
          ),
        ).toBe(days <= 7);
      }
    }
  });
});

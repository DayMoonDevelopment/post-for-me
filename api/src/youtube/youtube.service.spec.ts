import { google } from 'googleapis';
import type { SocialAccount } from '../lib/dto/global.dto';
import type { SupabaseService } from '../supabase/supabase.service';
import { YouTubeError, YouTubeService } from './youtube.service';

jest.mock('googleapis', () => ({
  google: {
    youtube: jest.fn(),
  },
}));

const mockedYoutube = google.youtube as jest.Mock;

interface FakeGoogleApiSubError {
  message?: string;
  domain?: string;
  reason?: string;
}

interface FakeGoogleApiErrorResponse {
  status: number;
  data: {
    error: FakeGoogleApiSubError & { errors?: FakeGoogleApiSubError[] };
  };
}

class FakeGoogleApiError extends Error {
  response: FakeGoogleApiErrorResponse;

  constructor(message: string, response: FakeGoogleApiErrorResponse) {
    super(message);
    this.response = response;
  }
}

// The exact message reported in the linked Sentry issue (PFM-861).
const SUSPENDED_ACCOUNT_MESSAGE =
  'The YouTube account of the authenticated user is suspended. In case the ' +
  'authenticated user is acting on behalf of another Google account, then ' +
  'this error refers to the latter.';

// Documented YouTube Data API v3 403 errors for an inaccessible account/
// channel: https://developers.google.com/youtube/v3/docs/errors
function makeDocumentedSuspensionError(
  reason: 'authenticatedUserAccountSuspended' | 'channelSuspended',
): FakeGoogleApiError {
  return new FakeGoogleApiError(SUSPENDED_ACCOUNT_MESSAGE, {
    status: 403,
    data: {
      error: {
        message: SUSPENDED_ACCOUNT_MESSAGE,
        errors: [
          { message: SUSPENDED_ACCOUNT_MESSAGE, domain: 'forbidden', reason },
        ],
      },
    },
  });
}

interface YouTubeServiceTestAccess {
  isSuspendedAccountError(error: unknown): boolean;
  oauth2Client: { setCredentials: jest.Mock } | null;
}

function asTestAccess(service: YouTubeService): YouTubeServiceTestAccess {
  return service as unknown as YouTubeServiceTestAccess;
}

function makeAccount(): SocialAccount {
  return {
    provider: 'youtube',
    id: 'account_1',
    social_provider_user_name: 'Test Channel',
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    access_token_expires_at: new Date(Date.now() + 60 * 60 * 1000),
    refresh_token_expires_at: null,
    social_provider_user_id: 'channel_1',
    social_provider_metadata: {},
  };
}

describe('YouTubeService', () => {
  let service: YouTubeService;

  beforeEach(() => {
    service = new YouTubeService({} as SupabaseService);
    mockedYoutube.mockReset();
  });

  describe('isSuspendedAccountError', () => {
    it('detects the documented authenticatedUserAccountSuspended reason', () => {
      const error = makeDocumentedSuspensionError(
        'authenticatedUserAccountSuspended',
      );

      expect(asTestAccess(service).isSuspendedAccountError(error)).toBe(true);
    });

    it('detects the documented channelSuspended reason', () => {
      const error = makeDocumentedSuspensionError('channelSuspended');

      expect(asTestAccess(service).isSuspendedAccountError(error)).toBe(true);
    });

    it('detects the reason even when the message text is unrelated', () => {
      const error = new FakeGoogleApiError('Forbidden', {
        status: 403,
        data: {
          error: {
            message: 'Forbidden',
            errors: [
              {
                message: 'Forbidden',
                domain: 'forbidden',
                reason: 'authenticatedUserAccountSuspended',
              },
            ],
          },
        },
      });

      expect(asTestAccess(service).isSuspendedAccountError(error)).toBe(true);
    });

    it('does not match a documented reason for a different, unrelated forbidden error', () => {
      const error = new FakeGoogleApiError('Forbidden', {
        status: 403,
        data: {
          error: {
            message: 'Forbidden',
            errors: [
              {
                message: 'Forbidden',
                domain: 'forbidden',
                reason: 'forbidden',
              },
            ],
          },
        },
      });

      expect(asTestAccess(service).isSuspendedAccountError(error)).toBe(false);
    });

    // Fallback path: no structured `reason` present (e.g. a wrapped/proxied
    // error), so detection falls back to matching the documented message.
    it('falls back to the exact known suspended-account message when no reason is present', () => {
      const error = new FakeGoogleApiError(SUSPENDED_ACCOUNT_MESSAGE, {
        status: 403,
        data: { error: { message: SUSPENDED_ACCOUNT_MESSAGE } },
      });

      expect(asTestAccess(service).isSuspendedAccountError(error)).toBe(true);
    });

    it('falls back to a reworded suspension message that still names the account and suspension', () => {
      const error = new FakeGoogleApiError(
        "This authenticated user's YouTube Account is currently suspended and cannot be accessed.",
        { status: 403, data: { error: {} } },
      );

      expect(asTestAccess(service).isSuspendedAccountError(error)).toBe(true);
    });

    it('falls back to a message only present in the nested API error body', () => {
      const error = new FakeGoogleApiError('The request failed', {
        status: 403,
        data: {
          error: {
            message: 'Forbidden',
            errors: [{ message: SUSPENDED_ACCOUNT_MESSAGE }],
          },
        },
      });

      expect(asTestAccess(service).isSuspendedAccountError(error)).toBe(true);
    });

    it('does not match an unrelated 403 error', () => {
      const error = new FakeGoogleApiError(
        'The permissions associated with the request are not sufficient to access the resource.',
        { status: 403, data: { error: {} } },
      );

      expect(asTestAccess(service).isSuspendedAccountError(error)).toBe(false);
    });

    it('does not match a non-403 error even with suspension-like wording or reason', () => {
      const error = new FakeGoogleApiError(SUSPENDED_ACCOUNT_MESSAGE, {
        status: 429,
        data: {
          error: {
            message: SUSPENDED_ACCOUNT_MESSAGE,
            errors: [
              {
                message: SUSPENDED_ACCOUNT_MESSAGE,
                reason: 'authenticatedUserAccountSuspended',
              },
            ],
          },
        },
      });

      expect(asTestAccess(service).isSuspendedAccountError(error)).toBe(false);
    });

    it('does not match a plain, non-object thrown value', () => {
      expect(asTestAccess(service).isSuspendedAccountError('boom')).toBe(false);
      expect(asTestAccess(service).isSuspendedAccountError(undefined)).toBe(
        false,
      );
    });
  });

  describe('getAccountPosts', () => {
    beforeEach(() => {
      asTestAccess(service).oauth2Client = { setCredentials: jest.fn() };
    });

    it('throws a suspended-account YouTubeError when the channel is suspended', async () => {
      const error = makeDocumentedSuspensionError(
        'authenticatedUserAccountSuspended',
      );

      mockedYoutube.mockReturnValue({
        channels: { list: jest.fn().mockRejectedValue(error) },
        playlistItems: { list: jest.fn() },
        videos: { list: jest.fn() },
      });

      let thrown: unknown;

      try {
        await service.getAccountPosts({ account: makeAccount(), limit: 10 });
      } catch (e) {
        thrown = e;
      }

      expect(thrown).toBeInstanceOf(YouTubeError);
      expect((thrown as YouTubeError).metadata.code).toBe('account_suspended');
    });

    it('degrades to an empty feed for any other error', async () => {
      const error = new FakeGoogleApiError('Internal error', {
        status: 500,
        data: { error: { message: 'Internal error' } },
      });

      mockedYoutube.mockReturnValue({
        channels: { list: jest.fn().mockRejectedValue(error) },
        playlistItems: { list: jest.fn() },
        videos: { list: jest.fn() },
      });

      await expect(
        service.getAccountPosts({ account: makeAccount(), limit: 10 }),
      ).resolves.toEqual({ posts: [], count: 0, has_more: false });
    });
  });
});

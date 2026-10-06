import { HttpException, HttpStatus } from '@nestjs/common';
import type { RequestUser } from '../auth/user.interface';
import { YouTubeError } from '../youtube/youtube.service';
import { SocialAccountFeedsController } from './social-account-feeds.controller';
import type { SocialAccountFeedsService } from './social-account-feeds.service';
import type { PlatformPostQueryDto } from './dto/platform-post-query.dto';

function makeUser(): RequestUser {
  return {
    id: 'user_1',
    projectId: 'project_1',
    apiKey: 'key_1',
    teamId: 'team_1',
  };
}

function makeQuery(): PlatformPostQueryDto {
  return { limit: 50 };
}

function makeYouTubeError(overrides: {
  code?: string;
  authFailure: boolean;
  retryable?: boolean;
  message?: string;
}): YouTubeError {
  return new YouTubeError(overrides.message ?? 'YouTube request failed', {
    provider: 'youtube',
    operation: 'refreshAccessToken',
    code: overrides.code,
    authFailure: overrides.authFailure,
    retryable: overrides.retryable ?? false,
  });
}

describe('SocialAccountFeedsController', () => {
  function makeController(getPlatformPosts: jest.Mock): {
    controller: SocialAccountFeedsController;
  } {
    const serviceStub = {
      getPlatformPosts,
    } as unknown as SocialAccountFeedsService;

    return { controller: new SocialAccountFeedsController(serviceStub) };
  }

  it('returns the feed as-is on success', async () => {
    const feed = { posts: [], count: 0, has_more: false };
    const { controller } = makeController(jest.fn().mockResolvedValue(feed));

    await expect(
      controller.getAccountFeed(
        { social_account_id: 'account_1' },
        makeQuery(),
        makeUser(),
      ),
    ).resolves.toBe(feed);
  });

  it('rethrows an HttpException from the service as-is', async () => {
    const notFound = new HttpException('Not found', HttpStatus.NOT_FOUND);
    const { controller } = makeController(
      jest.fn().mockRejectedValue(notFound),
    );

    await expect(
      controller.getAccountFeed(
        { social_account_id: 'account_1' },
        makeQuery(),
        makeUser(),
      ),
    ).rejects.toBe(notFound);
  });

  it('maps a suspended-account YouTubeError to 403', async () => {
    const error = makeYouTubeError({
      code: 'account_suspended',
      authFailure: true,
      retryable: false,
    });
    const { controller } = makeController(jest.fn().mockRejectedValue(error));

    let thrown: unknown;

    try {
      await controller.getAccountFeed(
        { social_account_id: 'account_1' },
        makeQuery(),
        makeUser(),
      );
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(HttpException);
    expect((thrown as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
  });

  it('maps a non-suspension YouTube auth failure (e.g. an expired/invalid refresh token) to 401', async () => {
    const error = makeYouTubeError({
      authFailure: true,
      retryable: false,
      message: 'invalid_grant',
    });
    const { controller } = makeController(jest.fn().mockRejectedValue(error));

    let thrown: unknown;

    try {
      await controller.getAccountFeed(
        { social_account_id: 'account_1' },
        makeQuery(),
        makeUser(),
      );
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(HttpException);
    expect((thrown as HttpException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('falls back to 500 for a non-auth-failure YouTubeError', async () => {
    const error = makeYouTubeError({
      authFailure: false,
      retryable: false,
    });
    const { controller } = makeController(jest.fn().mockRejectedValue(error));

    let thrown: unknown;

    try {
      await controller.getAccountFeed(
        { social_account_id: 'account_1' },
        makeQuery(),
        makeUser(),
      );
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(HttpException);
    expect((thrown as HttpException).getStatus()).toBe(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  it('falls back to 500 for an unrelated error', async () => {
    const { controller } = makeController(
      jest.fn().mockRejectedValue(new Error('boom')),
    );

    let thrown: unknown;

    try {
      await controller.getAccountFeed(
        { social_account_id: 'account_1' },
        makeQuery(),
        makeUser(),
      );
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(HttpException);
    expect((thrown as HttpException).getStatus()).toBe(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });
});

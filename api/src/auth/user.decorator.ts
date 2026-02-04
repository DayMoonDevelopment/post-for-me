import type { ExecutionContext } from '@nestjs/common';
import {
  createParamDecorator,
  InternalServerErrorException,
} from '@nestjs/common';
import type { RequestUser } from './user.interface';

import { AppLogger } from '../logger/app-logger';

const logger = new AppLogger('UserDecorator');

/**
 * @User() parameter decorator for Controller methods.
 * Extracts the user object ({ id: string }) attached to the request by the AuthGuard.
 *
 * IMPORTANT: This decorator should ONLY be used within routes protected by `@Protect()`
 * or a globally applied `AuthGuard`. Using it on unprotected routes will likely result
 * in an error or undefined behavior as `request.user` will not be set by the guard.
 */
export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    const user = request.user;

    // Add a check for safety, although the guard should prevent this state
    if (!user || typeof user.id !== 'string') {
      // This indicates a potential issue: Guard didn't run or failed unexpectedly
      logger.error(
        '@User() used without valid request.user; ensure AuthGuard is active',
      );
      throw new InternalServerErrorException(
        'User information not available on request.',
      );
    }

    return user;
  },
);

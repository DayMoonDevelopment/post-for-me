import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Unkey } from '@unkey/api';
import type { Request } from 'express';

import { UNKEY_INSTANCE } from '../unkey/unkey.module';

import { VERIFY_KEY_PERMISSIONS } from './verify-key.decorator';

/**
 * Generic Unkey-backed auth guard. Verifies the bearer token and optionally
 * enforces a permission query (via Unkey RBAC). Apply with `@VerifyKey(...)`.
 *
 * This is *not* the customer-facing auth primitive — that's `AuthGuard`,
 * which also extracts user/project/team identity and runs plan-type checks.
 * Use this guard for internal service-to-service calls where you only care
 * about "is the key valid and does it have permission X?".
 */
@Injectable()
export class VerifyKeyGuard implements CanActivate {
  constructor(
    @Inject(UNKEY_INSTANCE) private unkey: Unkey,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request) {
      throw new UnauthorizedException('Request object not available.');
    }

    const token = this.getBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Authorization token not found.');
    }

    const permissions = this.reflector.getAllAndOverride<string | undefined>(
      VERIFY_KEY_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );

    try {
      const response = await this.unkey.keys.verifyKey({
        key: token,
        permissions,
      });

      const data = response.data;

      if (!data) {
        throw new UnauthorizedException('Key verification failed.');
      }

      if (data.valid) return true;

      switch (data.code) {
        case 'INSUFFICIENT_PERMISSIONS':
        case 'FORBIDDEN':
          throw new ForbiddenException(
            permissions
              ? `Key lacks required permission: ${permissions}`
              : 'Key is forbidden from accessing this resource.',
          );
        default:
          throw new UnauthorizedException('Invalid or expired key.');
      }
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      console.error('[VerifyKeyGuard] verifyKey error', error);
      throw new UnauthorizedException('Authentication failed.');
    }
  }

  private getBearerToken(request: Request): string | null {
    const authorization = request.headers.authorization;

    if (typeof authorization !== 'string') {
      return null;
    }

    if (!authorization.startsWith('Bearer ')) {
      return null;
    }

    const parts = authorization.split(' ');
    if (parts.length !== 2 || !parts[1]) {
      return null;
    }

    return parts[1].trim() || null;
  }
}

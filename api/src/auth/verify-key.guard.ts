import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { getUnkeyPrincipalFromRequest } from './unkey-principal';

import { VERIFY_KEY_PERMISSIONS } from './verify-key.decorator';

/**
 * Generic Unkey-backed auth guard. Verifies the gateway-injected principal and
 * optionally enforces a permission query from the principal payload.
 * Apply with `@VerifyKey(...)`.
 *
 * This is *not* the customer-facing auth primitive — that's `AuthGuard`,
 * which also extracts user/project/team identity and runs plan-type checks.
 * Use this guard for internal service-to-service calls where you only care
 * about "is the key valid and does it have permission X?".
 */
@Injectable()
export class VerifyKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request) {
      throw new UnauthorizedException('Request object not available.');
    }

    const principal = getUnkeyPrincipalFromRequest(request);
    if (!principal || principal.type !== 'API_KEY') {
      throw new UnauthorizedException('Invalid or missing Unkey principal.');
    }

    const permissions = this.reflector.getAllAndOverride<string | undefined>(
      VERIFY_KEY_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );

    if (!permissions) {
      return true;
    }

    const grantedPermissions = principal.source?.key?.permissions;
    if (!Array.isArray(grantedPermissions)) {
      throw new ForbiddenException(
        `Key lacks required permission: ${permissions}`,
      );
    }

    if (!this.evaluatePermissionQuery(permissions, grantedPermissions)) {
      throw new ForbiddenException(
        `Key lacks required permission: ${permissions}`,
      );
    }

    return true;
  }

  private evaluatePermissionQuery(
    query: string,
    grantedPermissions: string[],
  ): boolean {
    const tokens = query.match(/\(|\)|\bAND\b|\bOR\b|[^\s()]+/gi);
    if (!tokens || tokens.length === 0) {
      return false;
    }

    const normalizedTokens = tokens.map((token) => token.trim());
    const granted = new Set(grantedPermissions);
    let index = 0;

    const parseExpression = (): boolean => {
      let value = parseTerm();

      while (normalizedTokens[index]?.toUpperCase() === 'OR') {
        index += 1;
        const nextValue = parseTerm();
        value = value || nextValue;
      }

      return value;
    };

    const parseTerm = (): boolean => {
      let value = parseFactor();

      while (normalizedTokens[index]?.toUpperCase() === 'AND') {
        index += 1;
        const nextValue = parseFactor();
        value = value && nextValue;
      }

      return value;
    };

    const parseFactor = (): boolean => {
      const token = normalizedTokens[index];

      if (!token) {
        throw new Error('Unexpected end of permission query.');
      }

      if (token === '(') {
        index += 1;
        const value = parseExpression();

        if (normalizedTokens[index] !== ')') {
          throw new Error('Missing closing parenthesis in permission query.');
        }

        index += 1;
        return value;
      }

      if (
        token === ')' ||
        token.toUpperCase() === 'AND' ||
        token.toUpperCase() === 'OR'
      ) {
        throw new Error('Malformed permission query.');
      }

      index += 1;
      return granted.has(token);
    };

    try {
      const result = parseExpression();
      return result && index === normalizedTokens.length;
    } catch {
      return false;
    }
  }
}

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Unkey } from '@unkey/api';
import type { Request, Response } from 'express';

import { SupabaseService } from '../supabase/supabase.service';
import type { RequestUser } from './user.interface';
import {
  Code,
  VerifyKeyRatelimitData,
} from '@unkey/api/dist/commonjs/models/components';

// Augment Express Request type (good practice)
declare module 'express' {
  interface Request {
    user?: RequestUser; // User object attached by the guard
    planType?: string; // Plan type from Unkey metadata
  }
}

type TokenValidationResult = {
  valid: boolean;
  userId?: string;
  projectId?: string;
  keyId?: string;
  teamId?: string;
  planType?: string;
  requestId?: string;
  code?: Code;
  ratelimits?: VerifyKeyRatelimitData[];
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private supabaseService: SupabaseService,
    @Inject('UNKEY_INSTANCE') private unkey: Unkey,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get the request object early
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    if (!request) {
      // Should typically not happen in HTTP context, but good to check
      throw new UnauthorizedException('Request object not available.');
    }

    return this.validateRequest(request, response); // Pass request and response directly
  }

  private async validateRequest(
    request: Request,
    response: Response,
  ): Promise<boolean> {
    try {
      const token = this.getBearerTokenFromRequest(request); // Get token from request

      if (!token) {
        throw new UnauthorizedException('Authorization token not found.');
      }

      const validationResult = await this.validateBearerToken(token);

      if (!validationResult.valid && validationResult.code === 'RATE_LIMITED') {
        this.applyRateLimitHeaders(response, validationResult.ratelimits);
        throw new HttpException(
          'Too many requests, please try again later',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      } else if (!validationResult.valid) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // --- Validation successful ---
      const { userId, projectId, keyId, teamId, planType } = validationResult;

      // Check if this is a request to social-account-feeds endpoint
      const isSocialAccountFeedsEndpoint = request.path.includes(
        '/social-account-feeds',
      );

      // If accessing social-account-feeds, plan_type must be "new_pricing"
      if (isSocialAccountFeedsEndpoint && planType !== 'new_pricing') {
        throw new UnauthorizedException(
          'Access to social account feeds requires new_pricing plan.',
        );
      }

      // Set the userId in the SupabaseService for subsequent use *within this request scope*
      this.supabaseService.setUser(userId!);

      // Attach the guaranteed user object to the request
      request.user = {
        id: userId!,
        projectId: projectId!,
        apiKey: keyId || '',
        teamId: teamId || '',
      };
      request.planType = planType;

      return true; // Access granted
    } catch (error: unknown) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof HttpException
      ) {
        throw error;
      }
      // Throw a generic one for other unexpected errors during validation
      throw new UnauthorizedException('Authentication failed.');
    }
  }

  private getBearerTokenFromRequest(request: Request): string | null {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return null;
    }

    if (
      typeof authorization !== 'string' ||
      !authorization.startsWith('Bearer ')
    ) {
      // Consider throwing UnauthorizedException here too for malformed header
      console.warn('Malformed Authorization header');
      return null;
    }

    const parts: string[] = authorization.split(' ');
    if (parts.length !== 2 || !parts[1]) {
      console.warn('Malformed Bearer token structure');
      return null; // Or throw
    }

    const token: string = parts[1].trim();
    return token || null;
  }

  private async validateBearerToken(
    token: string,
  ): Promise<TokenValidationResult> {
    try {
      const response = await this.unkey.keys.verifyKey({
        key: token,
      });

      const { data, meta } = response;

      if (!data?.valid) {
        // Token itself is invalid according to Unkey
        return {
          valid: false,
          code: data.code,
          ratelimits: data.ratelimits,
          requestId: meta?.requestId,
        };
      }

      let userId: string | undefined = undefined;
      let projectId: string | undefined = undefined;
      let teamId: string | undefined = undefined;
      let planType: string | undefined = undefined;

      if (data.meta?.created_by) {
        userId = data.meta?.created_by as string;
      }

      if (data.meta?.team_id) {
        teamId = data.meta?.team_id as string;
      }

      if (data.meta?.plan_type) {
        planType = data.meta?.plan_type as string;
      }

      if (data?.identity?.externalId) {
        projectId = data.identity.externalId;
      }

      if (!userId || !projectId) {
        // Valid token but missing the required user identifier
        console.warn(
          `[validateBearerToken] Valid token found but missing ownerId for token starting with: ${token.substring(
            0,
            8,
          )}...`,
        );
        return { valid: false, code: data.code };
      }

      // Both token valid AND userId present
      return {
        valid: true,
        code: data.code,
        userId,
        projectId,
        keyId: data.keyId,
        teamId,
        planType,
        requestId: meta?.requestId,
      };
    } catch (error) {
      console.error(
        '[validateBearerToken] Error during token verification:',
        error,
      );
      return { valid: false }; // Failed validation due to error
    }
  }

  private applyRateLimitHeaders(
    response: Response,
    ratelimits?: VerifyKeyRatelimitData[],
  ): void {
    if (!response) {
      return;
    }

    const exceededLimit =
      ratelimits?.find((limit) => limit.exceeded) ?? ratelimits?.[0];

    if (exceededLimit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(exceededLimit.reset / 1000),
      );

      response.setHeader('Retry-After', retryAfterSeconds.toString());
      response.setHeader('X-Rate-Limit-Limit', exceededLimit.limit.toString());
      response.setHeader(
        'X-Rate-Limit-Remaining',
        Math.max(exceededLimit.remaining, 0).toString(),
      );
      response.setHeader('X-Rate-Limit-Reset', retryAfterSeconds.toString());
      response.setHeader('X-Rate-Limit-Name', exceededLimit.name);
      response.setHeader(
        'X-Rate-Limit-Duration',
        Math.max(1, Math.ceil(exceededLimit.duration / 1000)).toString(),
      );
    }
  }
}

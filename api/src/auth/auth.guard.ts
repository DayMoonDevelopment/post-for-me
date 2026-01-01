import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Unkey } from '@unkey/api';
import type { Request } from 'express';

import { SupabaseService } from '../supabase/supabase.service';
import { PROTECT_OPTIONS } from './protect.decorator';
import type { RequestUser } from './user.interface';

// Augment Express Request type (good practice)
declare module 'express' {
  interface Request {
    user?: RequestUser; // User object attached by the guard
    planType?: string; // Plan type from Unkey metadata
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private supabaseService: SupabaseService,
    @Inject('UNKEY_INSTANCE') private unkey: Unkey,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options =
      this.reflector.get<Record<string, any>>(
        PROTECT_OPTIONS,
        context.getHandler(),
      ) || {};

    // Get the request object early
    const request = context.switchToHttp().getRequest<Request>();
    if (!request) {
      // Should typically not happen in HTTP context, but good to check
      throw new UnauthorizedException('Request object not available.');
    }

    return this.validateRequest(request, options); // Pass request directly
  }

  private async validateRequest(request: Request): Promise<boolean> {
    try {
      const token = this.getBearerTokenFromRequest(request); // Get token from request

      if (!token) {
        throw new UnauthorizedException('Authorization token not found.');
      }

      const validationResult = await this.validateBearerToken(token);

      // Strict check: valid must be true AND userId must exist
      if (
        !validationResult.valid ||
        !validationResult.userId ||
        !validationResult.teamId
      ) {
        throw new UnauthorizedException(
          'Invalid or expired token, or missing user identifier.',
        );
      }

      // --- Validation successful ---
      const userId = validationResult.userId; // Guaranteed to be a string here
      const projectId = validationResult.projectId!; // Guaranteed to be a string here
      const keyId = validationResult.keyId!; // Guaranteed to be a string here
      const teamId = validationResult.teamId; //Guranteed to be a string here
      const planType = validationResult.planType; // Optional plan type from metadata

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
      this.supabaseService.setUser(userId);

      // Attach the guaranteed user object to the request
      request.user = { id: userId, projectId, apiKey: keyId, teamId };
      request.planType = planType;

      return true; // Access granted
    } catch (error: unknown) {
      console.error(
        '[validateRequest] Authentication failed:',
        error instanceof Error ? error.message : 'Unknown error',
      ); // Re-throw UnauthorizedException or let specific errors bubble up
      if (error instanceof UnauthorizedException) {
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

  private async validateBearerToken(token: string): Promise<{
    valid: boolean;
    userId?: string;
    projectId?: string;
    keyId?: string;
    teamId?: string;
    planType?: string;
  }> {
    try {
      const response = await this.unkey.keys.verifyKey({
        key: token,
      });

      if (!response.data?.valid) {
        // Token itself is invalid according to Unkey
        return { valid: false };
      }

      let userId: string | undefined = undefined;
      let projectId: string | undefined = undefined;
      let teamId: string | undefined = undefined;
      let planType: string | undefined = undefined;

      if (response.data.meta?.created_by) {
        userId = response.data.meta?.created_by as string;
      }

      if (response.data.meta?.team_id) {
        teamId = response.data.meta?.team_id as string;
      }

      if (response.data.meta?.plan_type) {
        planType = response.data.meta?.plan_type as string;
      }

      if (response?.data.identity?.externalId) {
        projectId = response.data.identity.externalId;
      }

      if (!userId || !projectId) {
        // Valid token but missing the required user identifier
        console.warn(
          `[validateBearerToken] Valid token found but missing ownerId for token starting with: ${token.substring(
            0,
            8,
          )}...`,
        );
        return { valid: false }; // Treat as invalid for our purpose
      }

      // Both token valid AND userId present
      return {
        valid: true,
        userId,
        projectId,
        keyId: response.data.keyId,
        teamId,
        planType,
      };
    } catch (error) {
      console.error(
        '[validateBearerToken] Error during token verification:',
        error,
      );
      return { valid: false }; // Failed validation due to error
    }
  }
}

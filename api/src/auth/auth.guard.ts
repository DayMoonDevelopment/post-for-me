import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { SupabaseService } from '../supabase/supabase.service';
import { getMetaString, getUnkeyPrincipalFromRequest } from './unkey-principal';
import type { RequestUser } from './user.interface';

// Augment Express Request type (good practice)
declare module 'express' {
  interface Request {
    user?: RequestUser; // User object attached by the guard
    planType?: string; // Plan type from Unkey metadata
  }
}

type TokenValidationResult = {
  isAuthenticated: boolean;
  userId?: string;
  projectId?: string;
  keyId?: string;
  teamId?: string;
  planType?: string;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private supabaseService: SupabaseService) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the request object early
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    if (!request) {
      // Should typically not happen in HTTP context, but good to check
      throw new UnauthorizedException('Request object not available.');
    }

    // Browsers never attach Authorization to a CORS preflight request, so
    // guarding OPTIONS would 401 every preflight before it reaches the
    // route handler (and before @tus/server's own preflight handling, on
    // routes that have it). CORS headers for the preflight are set by
    // app.enableCors() in main.ts.
    if (request.method === 'OPTIONS') {
      return true;
    }

    return this.validateRequest(request);
  }

  private validateRequest(request: Request): boolean {
    try {
      const validationResult = this.getAuthenticationFromPrincipal(request);

      if (!validationResult.isAuthenticated) {
        throw new UnauthorizedException('Invalid or missing Unkey principal');
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
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Throw a generic one for other unexpected errors during validation
      throw new UnauthorizedException('Authentication failed.');
    }
  }

  private getAuthenticationFromPrincipal(
    request: Request,
  ): TokenValidationResult {
    const principal = getUnkeyPrincipalFromRequest(request);

    if (!principal || principal.type !== 'API_KEY') {
      return { isAuthenticated: false };
    }

    const keyMeta = principal.source?.key?.meta;
    const userId = getMetaString(keyMeta, 'created_by');
    const projectId = principal.identity?.externalId;
    const keyId = principal.source?.key?.keyId;
    const teamId = getMetaString(keyMeta, 'team_id');
    const planType = getMetaString(keyMeta, 'plan_type');

    if (!userId || !projectId) {
      return { isAuthenticated: false };
    }

    return {
      isAuthenticated: true,
      userId,
      projectId,
      keyId,
      teamId,
      planType,
    };
  }
}

import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { Unkey } from '@unkey/api';
import { describe, expect, it, vi } from 'vitest';

import type { SupabaseService } from '../supabase/supabase.service';
import { AuthGuard } from './auth.guard';
import type { RequestUser } from './user.interface';

interface MockRequest {
  headers: Record<string, string>;
  path: string;
  user?: RequestUser;
  planType?: string;
}

interface MockResponse {
  setHeader: ReturnType<typeof vi.fn>;
}

describe('AuthGuard', () => {
  function buildContext({
    authorization,
    path = '/social-posts',
  }: {
    authorization?: string;
    path?: string;
  }) {
    const request: MockRequest = {
      headers: authorization ? { authorization } : {},
      path,
    };

    const response: MockResponse = {
      setHeader: vi.fn(),
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;

    return { context, request, response };
  }

  function buildGuard({ verifyKey }: { verifyKey: ReturnType<typeof vi.fn> }) {
    const setUser = vi.fn();
    const supabaseService = { setUser } as unknown as SupabaseService;
    const unkey = { keys: { verifyKey } } as unknown as Unkey;

    return {
      guard: new AuthGuard(supabaseService, unkey),
      setUser,
    };
  }

  it('rejects a request with no Authorization header', async () => {
    const { guard } = buildGuard({ verifyKey: vi.fn() });
    const { context } = buildContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a malformed Authorization header (no Bearer prefix)', async () => {
    const { guard } = buildGuard({ verifyKey: vi.fn() });
    const { context } = buildContext({ authorization: 'Token abc123' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an empty bearer token', async () => {
    const { guard } = buildGuard({ verifyKey: vi.fn() });
    const { context } = buildContext({ authorization: 'Bearer ' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects when unkey reports the token as invalid', async () => {
    const verifyKey = vi.fn().mockResolvedValue({
      data: { valid: false, code: 'NOT_FOUND' },
      meta: {},
    });
    const { guard } = buildGuard({ verifyKey });
    const { context } = buildContext({ authorization: 'Bearer bad-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('applies rate-limit headers and throws 429 when unkey reports RATE_LIMITED', async () => {
    const verifyKey = vi.fn().mockResolvedValue({
      data: {
        valid: false,
        code: 'RATE_LIMITED',
        ratelimits: [
          {
            name: 'default',
            exceeded: true,
            limit: 100,
            remaining: 0,
            reset: 5000,
            duration: 60000,
          },
        ],
      },
      meta: {},
    });
    const { guard } = buildGuard({ verifyKey });
    const { context, response } = buildContext({
      authorization: 'Bearer rate-limited-token',
    });

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 429,
    });

    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '5');
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Rate-Limit-Limit',
      '100',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Rate-Limit-Remaining',
      '0',
    );
  });

  it('rejects a valid token that is missing userId/projectId', async () => {
    const verifyKey = vi.fn().mockResolvedValue({
      data: {
        valid: true,
        code: 'VALID',
        keyId: 'key_1',
        meta: {},
        identity: undefined,
      },
      meta: {},
    });
    const { guard } = buildGuard({ verifyKey });
    const { context } = buildContext({ authorization: 'Bearer valid-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects when unkey.keys.verifyKey throws', async () => {
    const verifyKey = vi.fn().mockRejectedValue(new Error('network error'));
    const { guard } = buildGuard({ verifyKey });
    const { context } = buildContext({ authorization: 'Bearer valid-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects access to /social-account-feeds when plan_type is not new_pricing', async () => {
    const verifyKey = vi.fn().mockResolvedValue({
      data: {
        valid: true,
        code: 'VALID',
        keyId: 'key_1',
        meta: { created_by: 'user_1', team_id: 'team_1', plan_type: 'legacy' },
        identity: { externalId: 'project_1' },
      },
      meta: {},
    });
    const { guard } = buildGuard({ verifyKey });
    const { context } = buildContext({
      authorization: 'Bearer valid-token',
      path: '/social-account-feeds',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('allows access to /social-account-feeds when plan_type is new_pricing', async () => {
    const verifyKey = vi.fn().mockResolvedValue({
      data: {
        valid: true,
        code: 'VALID',
        keyId: 'key_1',
        meta: {
          created_by: 'user_1',
          team_id: 'team_1',
          plan_type: 'new_pricing',
        },
        identity: { externalId: 'project_1' },
      },
      meta: {},
    });
    const { guard } = buildGuard({ verifyKey });
    const { context, request } = buildContext({
      authorization: 'Bearer valid-token',
      path: '/social-account-feeds',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'user_1',
      projectId: 'project_1',
      apiKey: 'key_1',
      teamId: 'team_1',
    });
  });

  it('grants access on the happy path and attaches request.user / calls setUser', async () => {
    const verifyKey = vi.fn().mockResolvedValue({
      data: {
        valid: true,
        code: 'VALID',
        keyId: 'key_1',
        meta: { created_by: 'user_1', team_id: 'team_1' },
        identity: { externalId: 'project_1' },
      },
      meta: {},
    });
    const { guard, setUser } = buildGuard({ verifyKey });
    const { context, request } = buildContext({
      authorization: 'Bearer valid-token',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(setUser).toHaveBeenCalledWith('user_1');
    expect(request.user).toEqual({
      id: 'user_1',
      projectId: 'project_1',
      apiKey: 'key_1',
      teamId: 'team_1',
    });
  });

  it('defaults keyId/teamId to empty strings when unkey omits them', async () => {
    const verifyKey = vi.fn().mockResolvedValue({
      data: {
        valid: true,
        code: 'VALID',
        keyId: undefined,
        meta: { created_by: 'user_1' },
        identity: { externalId: 'project_1' },
      },
      meta: {},
    });
    const { guard } = buildGuard({ verifyKey });
    const { context, request } = buildContext({
      authorization: 'Bearer valid-token',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'user_1',
      projectId: 'project_1',
      apiKey: '',
      teamId: '',
    });
  });
});

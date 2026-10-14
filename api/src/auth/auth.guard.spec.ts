import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { SupabaseService } from '../supabase/supabase.service';
import { AuthGuard } from './auth.guard';
import type { UnkeyPrincipal } from './unkey-principal';
import type { RequestUser } from './user.interface';

function makePrincipal(): UnkeyPrincipal {
  return {
    version: 'v1',
    subject: 'key_1',
    type: 'API_KEY',
    identity: { externalId: 'project_1' },
    source: {
      key: {
        keyId: 'key_1',
        keySpaceId: 'space_1',
        meta: { created_by: 'user_1', team_id: 'team_1' },
      },
    },
  };
}

function buildGuard(
  headers: Record<string, string | undefined> = {},
  path = '/social-posts',
) {
  const request: {
    headers: Record<string, string | undefined>;
    path: string;
    user?: RequestUser;
    planType?: string;
  } = { headers, path };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  const setUser = vi.fn();
  const guard = new AuthGuard({ setUser } as unknown as SupabaseService);

  return { guard, context, request, setUser };
}

describe('AuthGuard', () => {
  it.each([
    {},
    { authorization: 'Bearer token' },
    { 'x-unkey-principal': '' },
    { 'x-unkey-principal': '{invalid' },
    { 'x-unkey-principal': 'null' },
    { 'x-unkey-principal': '{}' },
    {
      'x-unkey-principal': JSON.stringify({ ...makePrincipal(), type: 'USER' }),
    },
  ])('rejects missing or invalid gateway principals: %j', (headers) => {
    const { guard, context, setUser } = buildGuard(headers);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(setUser).not.toHaveBeenCalled();
  });

  it.each(['created_by', 'projectId'])(
    'rejects a principal missing %s',
    (field) => {
      const principal = makePrincipal();
      if (field === 'created_by') {
        principal.source!.key!.meta = {};
      } else {
        principal.identity = undefined;
      }
      const { guard, context } = buildGuard({
        'x-unkey-principal': JSON.stringify(principal),
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    },
  );

  it('attaches the principal identity and sets the Supabase user', () => {
    const { guard, context, request, setUser } = buildGuard({
      'x-unkey-principal': JSON.stringify(makePrincipal()),
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(setUser).toHaveBeenCalledWith('user_1');
    expect(request.user).toEqual({
      id: 'user_1',
      projectId: 'project_1',
      apiKey: 'key_1',
      teamId: 'team_1',
    });
  });

  it.each([undefined, 'legacy', 'new_pricing'])(
    'enforces the social-account-feeds plan requirement for %s',
    (planType) => {
      const principal = makePrincipal();
      principal.source!.key!.meta.plan_type = planType;
      const { guard, context, request, setUser } = buildGuard(
        { 'x-unkey-principal': JSON.stringify(principal) },
        '/social-account-feeds',
      );

      if (planType === 'new_pricing') {
        expect(guard.canActivate(context)).toBe(true);
        expect(request.planType).toBe('new_pricing');
      } else {
        expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
        expect(setUser).not.toHaveBeenCalled();
      }
    },
  );

  it('defaults omitted keyId and teamId to empty strings', () => {
    const principal = makePrincipal();
    // A gateway payload may omit optional identity metadata at runtime.
    const key = principal.source!.key!;
    const { guard, context, request } = buildGuard({
      'x-unkey-principal': JSON.stringify({
        ...principal,
        source: {
          key: { ...key, keyId: undefined, meta: { created_by: 'user_1' } },
        },
      }),
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual({
      id: 'user_1',
      projectId: 'project_1',
      apiKey: '',
      teamId: '',
    });
  });
});

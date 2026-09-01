import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

import { AuthGuard } from './auth.guard';
import type { SupabaseService } from '../supabase/supabase.service';
import type { UnkeyPrincipal } from './unkey-principal';

function createContext(overrides: {
  method: string;
  principal?: Partial<UnkeyPrincipal>;
  path?: string;
}): ExecutionContext {
  const request = {
    method: overrides.method,
    headers: overrides.principal
      ? { 'x-unkey-principal': JSON.stringify(overrides.principal) }
      : {},
    path: overrides.path ?? '/media/tus',
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

function validPrincipal(
  overrides: Record<string, unknown> = {},
): UnkeyPrincipal {
  return {
    version: '1',
    subject: 'key_123',
    type: 'API_KEY',
    identity: { externalId: 'project_1' },
    source: {
      key: {
        keyId: 'key_123',
        keySpaceId: 'ks_123',
        meta: { created_by: 'user_1', team_id: 'team_1', ...overrides },
      },
    },
  };
}

describe('AuthGuard', () => {
  let setUser: jest.Mock;
  let guard: AuthGuard;

  beforeEach(() => {
    setUser = jest.fn();

    const supabaseService = { setUser } as unknown as SupabaseService;

    guard = new AuthGuard(supabaseService);
  });

  it('bypasses auth entirely for OPTIONS requests (CORS preflight)', () => {
    const context = createContext({ method: 'OPTIONS' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects non-OPTIONS requests with no principal header', () => {
    const context = createContext({ method: 'GET' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a principal that is not an API_KEY', () => {
    const context = createContext({
      method: 'GET',
      principal: { ...validPrincipal(), type: 'JWT' },
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a principal missing userId or projectId metadata', () => {
    const principal = validPrincipal();
    delete principal.identity!.externalId;

    const context = createContext({ method: 'GET', principal });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('grants access and attaches the user for a valid principal', () => {
    const context = createContext({
      method: 'POST',
      principal: validPrincipal(),
    });
    const request = context.switchToHttp().getRequest<{
      user?: unknown;
    }>();

    expect(guard.canActivate(context)).toBe(true);
    expect(setUser).toHaveBeenCalledWith('user_1');
    expect(request.user).toEqual({
      id: 'user_1',
      projectId: 'project_1',
      apiKey: 'key_123',
      teamId: 'team_1',
    });
  });

  it('rejects social-account-feeds access without the new_pricing plan', () => {
    const context = createContext({
      method: 'GET',
      path: '/social-account-feeds',
      principal: validPrincipal(),
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('allows social-account-feeds access with the new_pricing plan', () => {
    const context = createContext({
      method: 'GET',
      path: '/social-account-feeds',
      principal: validPrincipal({ plan_type: 'new_pricing' }),
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});

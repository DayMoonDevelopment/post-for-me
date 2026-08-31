import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Unkey } from '@unkey/api';

import { AuthGuard } from './auth.guard';
import type { SupabaseService } from '../supabase/supabase.service';

function createContext(overrides: {
  method: string;
  headers?: Record<string, string>;
  path?: string;
}): ExecutionContext {
  const request = {
    method: overrides.method,
    headers: overrides.headers ?? {},
    path: overrides.path ?? '/media/tus',
  };
  const response = { setHeader: jest.fn() };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  let verifyKey: jest.Mock;
  let setUser: jest.Mock;
  let guard: AuthGuard;

  beforeEach(() => {
    verifyKey = jest.fn();
    setUser = jest.fn();

    const unkey = { keys: { verifyKey } } as unknown as Unkey;
    const supabaseService = { setUser } as unknown as SupabaseService;

    guard = new AuthGuard(supabaseService, unkey);
  });

  it('bypasses auth entirely for OPTIONS requests (CORS preflight)', async () => {
    const context = createContext({ method: 'OPTIONS' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyKey).not.toHaveBeenCalled();
  });

  it('rejects non-OPTIONS requests with no Authorization header', async () => {
    const context = createContext({ method: 'GET' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(verifyKey).not.toHaveBeenCalled();
  });

  it('grants access and attaches the user for a valid Bearer token', async () => {
    verifyKey.mockResolvedValue({
      data: {
        valid: true,
        code: 'VALID',
        keyId: 'key_123',
        identity: { externalId: 'project_1' },
        meta: { created_by: 'user_1', team_id: 'team_1' },
      },
      meta: { requestId: 'req_1' },
    });

    const context = createContext({
      method: 'POST',
      headers: { authorization: 'Bearer test-token' },
    });
    const request = context.switchToHttp().getRequest<{
      user?: unknown;
    }>();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(setUser).toHaveBeenCalledWith('user_1');
    expect(request.user).toEqual({
      id: 'user_1',
      projectId: 'project_1',
      apiKey: 'key_123',
      teamId: 'team_1',
    });
  });
});

import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Unkey } from '@unkey/api';
import { describe, expect, it, vi } from 'vitest';

import { VerifyKeyGuard } from './verify-key.guard';

interface MockRequest {
  headers: Record<string, string>;
}

describe('VerifyKeyGuard', () => {
  function buildContext({
    authorization,
    permissions,
  }: {
    authorization?: string;
    permissions?: string;
  }) {
    const request: MockRequest = {
      headers: authorization ? { authorization } : {},
    };

    const getAllAndOverride = vi.fn().mockReturnValue(permissions);
    const reflector = { getAllAndOverride } as unknown as Reflector;

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;

    return { context, reflector, getAllAndOverride };
  }

  function buildGuard({
    verifyKey,
    reflector,
  }: {
    verifyKey: ReturnType<typeof vi.fn>;
    reflector: Reflector;
  }) {
    const unkey = { keys: { verifyKey } } as unknown as Unkey;
    return new VerifyKeyGuard(unkey, reflector);
  }

  it('rejects a request with no Authorization header', async () => {
    const { context, reflector } = buildContext({});
    const guard = buildGuard({ verifyKey: vi.fn(), reflector });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a malformed Authorization header', async () => {
    const { context, reflector } = buildContext({
      authorization: 'Token abc123',
    });
    const guard = buildGuard({ verifyKey: vi.fn(), reflector });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an empty bearer token', async () => {
    const { context, reflector } = buildContext({ authorization: 'Bearer ' });
    const guard = buildGuard({ verifyKey: vi.fn(), reflector });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects when unkey returns no data', async () => {
    const verifyKey = vi.fn().mockResolvedValue({ data: null });
    const { context, reflector } = buildContext({
      authorization: 'Bearer token-1',
    });
    const guard = buildGuard({ verifyKey, reflector });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('grants access for a valid key with no permission requirement', async () => {
    const verifyKey = vi.fn().mockResolvedValue({ data: { valid: true } });
    const { context, reflector } = buildContext({
      authorization: 'Bearer token-1',
    });
    const guard = buildGuard({ verifyKey, reflector });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('passes the reflected permission query through to unkey.keys.verifyKey', async () => {
    const verifyKey = vi.fn().mockResolvedValue({ data: { valid: true } });
    const { context, reflector } = buildContext({
      authorization: 'Bearer token-1',
      permissions: 'cms.read AND cms.write',
    });
    const guard = buildGuard({ verifyKey, reflector });

    await guard.canActivate(context);

    expect(verifyKey).toHaveBeenCalledWith({
      key: 'token-1',
      permissions: 'cms.read AND cms.write',
    });
  });

  it('throws Forbidden with the permission query when unkey returns INSUFFICIENT_PERMISSIONS', async () => {
    const verifyKey = vi.fn().mockResolvedValue({
      data: { valid: false, code: 'INSUFFICIENT_PERMISSIONS' },
    });
    const { context, reflector } = buildContext({
      authorization: 'Bearer token-1',
      permissions: 'cms.write',
    });
    const guard = buildGuard({ verifyKey, reflector });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Key lacks required permission: cms.write'),
    );
  });

  it('throws a generic Forbidden when unkey returns FORBIDDEN with no permission query', async () => {
    const verifyKey = vi.fn().mockResolvedValue({
      data: { valid: false, code: 'FORBIDDEN' },
    });
    const { context, reflector } = buildContext({
      authorization: 'Bearer token-1',
    });
    const guard = buildGuard({ verifyKey, reflector });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Key is forbidden from accessing this resource.'),
    );
  });

  it('throws Unauthorized for any other invalid code', async () => {
    const verifyKey = vi.fn().mockResolvedValue({
      data: { valid: false, code: 'NOT_FOUND' },
    });
    const { context, reflector } = buildContext({
      authorization: 'Bearer token-1',
    });
    const guard = buildGuard({ verifyKey, reflector });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('wraps a thrown verifyKey error as Unauthorized', async () => {
    const verifyKey = vi.fn().mockRejectedValue(new Error('network error'));
    const { context, reflector } = buildContext({
      authorization: 'Bearer token-1',
    });
    const guard = buildGuard({ verifyKey, reflector });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

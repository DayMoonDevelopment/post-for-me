import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import { VERIFY_KEY_PERMISSIONS } from './verify-key.decorator';
import { VerifyKeyGuard } from './verify-key.guard';

function buildGuard({ header, query }: { header?: string; query?: string }) {
  const getAllAndOverride = vi.fn().mockReturnValue(query);
  const guard = new VerifyKeyGuard({
    getAllAndOverride,
  } as unknown as Reflector);
  const handler = vi.fn();
  const controller = vi.fn();
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: header ? { 'x-unkey-principal': header } : {},
      }),
    }),
    getHandler: () => handler,
    getClass: () => controller,
  } as unknown as ExecutionContext;

  return { guard, context, getAllAndOverride, handler, controller };
}

function principalHeader(permissions?: string[]) {
  return JSON.stringify({
    version: 'v1',
    subject: 'key_1',
    type: 'API_KEY',
    source: {
      key: { keyId: 'key_1', keySpaceId: 'space_1', meta: {}, permissions },
    },
  });
}

describe('VerifyKeyGuard', () => {
  it.each([
    undefined,
    '',
    '{invalid',
    'null',
    '{}',
    JSON.stringify({
      version: 'v1',
      subject: 'user_1',
      type: 'USER',
    }),
  ])('rejects missing or invalid principals: %s', (header) => {
    const { guard, context } = buildGuard({ header });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('allows a valid principal without a permission requirement', () => {
    const { guard, context, getAllAndOverride, handler, controller } =
      buildGuard({
        header: principalHeader(),
      });

    expect(guard.canActivate(context)).toBe(true);
    expect(getAllAndOverride).toHaveBeenCalledWith(VERIFY_KEY_PERMISSIONS, [
      handler,
      controller,
    ]);
  });

  it.each([
    ['cms.read', ['cms.read']],
    ['cms.read AND cms.write', ['cms.read', 'cms.write']],
    ['cms.read OR cms.write', ['cms.write']],
    ['(cms.read OR cms.write) AND cms.admin', ['cms.write', 'cms.admin']],
    ['cms.read or cms.write and cms.admin', ['cms.read']],
  ])('allows a satisfied permission query: %s', (query, permissions) => {
    const { guard, context } = buildGuard({
      header: principalHeader(permissions),
      query,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it.each([
    'cms.write',
    'cms.read AND cms.write',
    '(cms.read OR cms.write) AND cms.admin',
    'cms.read AND',
    '(cms.read',
    'cms.read cms.write',
    'cms.read )',
  ])('rejects unsatisfied or malformed queries: %s', (query) => {
    const { guard, context } = buildGuard({
      header: principalHeader(['cms.read']),
      query,
    });

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException(`Key lacks required permission: ${query}`),
    );
  });

  it('rejects a principal without permissions when a permission is required', () => {
    const { guard, context } = buildGuard({
      header: principalHeader(),
      query: 'cms.read',
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});

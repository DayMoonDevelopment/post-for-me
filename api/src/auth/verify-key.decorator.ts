import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

import { VerifyKeyGuard } from './verify-key.guard';

export const VERIFY_KEY_PERMISSIONS = 'verify_key_permissions';

export interface VerifyKeyOptions {
  /**
   * Unkey permission query required to access this route. Supports the same
   * syntax as `keys.verifyKey({ permissions })`:
   *   - single: "cms.read"
   *   - AND/OR: "cms.read AND cms.write"
   *   - grouped: "(cms.read OR cms.write) AND authors.view"
   *
   * When omitted, the guard only checks that the key itself is valid — no
   * permission requirement.
   */
  permissions?: string;
}

/**
 * Require a valid Unkey bearer token for this route or controller, with an
 * optional permission query enforced by Unkey RBAC. Controllers (including
 * those under `/private/*`) opt in explicitly — nothing is protected by
 * being located in a particular module.
 */
export function VerifyKey(options: VerifyKeyOptions = {}) {
  return applyDecorators(
    SetMetadata(VERIFY_KEY_PERMISSIONS, options.permissions),
    UseGuards(VerifyKeyGuard),
  );
}

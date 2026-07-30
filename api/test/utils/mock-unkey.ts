import { vi } from 'vitest';

export interface MockUnkeyClient {
  keys: { verifyKey: ReturnType<typeof vi.fn> };
}

export function createMockUnkeyClient(): MockUnkeyClient {
  return { keys: { verifyKey: vi.fn() } };
}

export function validVerifyKeyResponse({
  userId,
  projectId,
  teamId,
  planType,
  keyId = 'test_key',
}: {
  userId: string;
  projectId: string;
  teamId: string;
  planType?: string;
  keyId?: string;
}) {
  return {
    data: {
      valid: true,
      code: 'VALID',
      keyId,
      meta: { created_by: userId, team_id: teamId, plan_type: planType },
      identity: { externalId: projectId },
    },
    meta: { requestId: 'e2e-test-request' },
  };
}

export function invalidVerifyKeyResponse(code: string = 'NOT_FOUND') {
  return {
    data: { valid: false, code },
    meta: { requestId: 'e2e-test-request' },
  };
}

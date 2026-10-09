import type { UnkeyPrincipal } from '../../src/auth/unkey-principal';

export function principalHeader({
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
}): string {
  const principal: UnkeyPrincipal = {
    version: 'v1',
    subject: keyId,
    type: 'API_KEY',
    identity: { externalId: projectId },
    source: {
      key: {
        keyId,
        keySpaceId: 'e2e-test',
        meta: { created_by: userId, team_id: teamId, plan_type: planType },
      },
    },
  };

  return JSON.stringify(principal);
}

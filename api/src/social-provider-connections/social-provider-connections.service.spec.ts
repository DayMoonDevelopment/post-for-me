import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseService } from '../supabase/supabase.service';
import { SocialAccountsService } from './social-provider-connections.service';

function makeAccount(provider = 'x', isSystem: boolean | null = true) {
  return Object.freeze({
    id: `account_${provider}`,
    provider,
    social_provider_user_name: 'username',
    social_provider_user_id: 'user_1',
    social_provider_profile_photo_url: 'https://example.com/photo.jpg',
    access_token: 'secret-access-token',
    refresh_token: 'secret-refresh-token',
    access_token_expires_at: '2099-01-01T00:00:00Z',
    refresh_token_expires_at: '2099-02-01T00:00:00Z',
    external_id: 'external_1',
    social_provider_metadata: { connection_type: 'oauth2' },
    projects: isSystem === null ? null : { is_system: isSystem },
  });
}

function makeService(data: unknown, error: unknown = null) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    range: vi.fn(() => chain),
    order: vi.fn(() => chain),
    maybeSingle: vi.fn(() => chain),
    then: (resolve: (result: unknown) => unknown) =>
      resolve({ data, error, count: Array.isArray(data) ? data.length : 0 }),
  };
  const from = vi.fn(() => chain);
  const service = new SocialAccountsService(
    { supabaseClient: { from } } as unknown as SupabaseService,
    {} as ConfigService,
  );
  return { service, chain, from };
}

describe('social account fetch response tokens', () => {
  it.each([true, false])(
    'redacts only Quickstart X tokens in a mixed-platform list (is_system=%s)',
    async (isSystem) => {
      const rows = ['x', 'facebook', 'instagram', 'linkedin', 'tiktok'].map(
        (provider) => makeAccount(provider, isSystem),
      );
      const { service, chain, from } = makeService(rows);

      const result = await service.getSocialAccounts(
        { offset: 0, limit: 10 },
        'project_1',
      );

      expect(result.count).toBe(rows.length);
      expect(result.data).toHaveLength(rows.length);
      result.data.forEach((account, index) => {
        const raw = rows[index];
        const hidden = isSystem && raw.provider === 'x';
        expect(account).toMatchObject({
          id: raw.id,
          platform: raw.provider,
          status: 'connected',
          access_token: hidden ? '' : raw.access_token,
          refresh_token: hidden ? '' : raw.refresh_token,
          access_token_expires_at: raw.access_token_expires_at,
          refresh_token_expires_at: raw.refresh_token_expires_at,
          metadata: raw.social_provider_metadata,
        });
        expect(account).not.toHaveProperty('projects');
        // Response mapping must never erase the credentials used internally.
        expect(raw.access_token).toBe('secret-access-token');
        expect(raw.refresh_token).toBe('secret-refresh-token');
      });
      expect(from).toHaveBeenCalledTimes(1);
      expect(from).toHaveBeenCalledWith('social_provider_connections');
      expect(chain.select).toHaveBeenCalledWith(
        expect.stringContaining('projects(is_system)'),
        { count: 'estimated', head: false },
      );
      expect(chain.eq).toHaveBeenCalledWith('project_id', 'project_1');
      expect(chain.range).toHaveBeenCalledWith(0, 9);
    },
  );

  it.each([
    ['x', true, true],
    ['x', false, false],
    ['facebook', true, false],
    ['facebook', false, false],
    ['x', null, true],
  ] as const)(
    'fetches %s with is_system=%s (redacted=%s)',
    async (provider, isSystem, hidden) => {
      const raw = makeAccount(provider, isSystem);
      const { service, chain } = makeService(raw);

      const account = await service.getSocialAccountById({
        id: raw.id,
        projectId: 'project_1',
      });

      expect(account).toMatchObject({
        id: raw.id,
        platform: provider,
        status: 'connected',
        access_token: hidden ? '' : raw.access_token,
        refresh_token: hidden ? '' : raw.refresh_token,
        access_token_expires_at: raw.access_token_expires_at,
        refresh_token_expires_at: raw.refresh_token_expires_at,
      });
      expect(account).not.toHaveProperty('projects');
      expect(raw.access_token).toBe('secret-access-token');
      expect(raw.refresh_token).toBe('secret-refresh-token');
      expect(chain.select).toHaveBeenCalledWith(
        expect.stringContaining('projects(is_system)'),
      );
      expect(chain.eq).toHaveBeenCalledWith('id', raw.id);
      expect(chain.eq).toHaveBeenCalledWith('project_id', 'project_1');
    },
  );

  it('keeps disconnected status when tokens are absent', async () => {
    const raw = {
      ...makeAccount(),
      access_token: null,
      refresh_token: null,
    };
    const { service } = makeService(raw);
    await expect(
      service.getSocialAccountById({ id: raw.id, projectId: 'project_1' }),
    ).resolves.toMatchObject({
      status: 'disconnected',
      access_token: '',
      refresh_token: '',
    });
  });

  it('returns null for an account not found in the project', async () => {
    const { service } = makeService(null);
    await expect(
      service.getSocialAccountById({ id: 'missing', projectId: 'project_1' }),
    ).resolves.toBeNull();
  });

  it('propagates query errors instead of returning unredacted data', async () => {
    const error = new Error('project join failed');
    const { service } = makeService(null, error);
    await expect(
      service.getSocialAccountById({ id: 'account_x', projectId: 'project_1' }),
    ).rejects.toBe(error);
    await expect(
      service.getSocialAccounts({ offset: 0, limit: 10 }, 'project_1'),
    ).rejects.toBe(error);
  });
});

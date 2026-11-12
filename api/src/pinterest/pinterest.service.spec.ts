import 'reflect-metadata';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import type { Request } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseService } from '../supabase/supabase.service';
import { PinterestService } from './pinterest.service';

function setup(
  overrides: Record<string, unknown> = {},
  projectId = 'project_1',
) {
  const account = {
    id: 'account_1',
    provider: 'pinterest',
    project_id: 'project_1',
    access_token: 'old-token',
    refresh_token: 'refresh-token',
    access_token_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    refresh_token_expires_at: null,
    social_provider_user_id: 'pinterest-user',
    social_provider_user_name: 'name',
    social_provider_metadata: {},
    ...overrides,
  };
  const filters: Record<string, unknown> = {};
  const lookup = {
    select: vi.fn(() => lookup),
    eq: vi.fn((key: string, value: unknown) => {
      filters[key] = value;
      return lookup;
    }),
    single: vi.fn(() =>
      Promise.resolve({
        data:
          filters.project_id === account.project_id && filters.id === account.id
            ? account
            : null,
        error: null,
      }),
    ),
  };
  const update = {
    eq: vi.fn(() => update),
    then: (resolve: (value: unknown) => unknown) =>
      resolve({ error: updateError }),
  };
  let updateError: unknown = null;
  const updateFn = vi.fn(() => update);
  const client = {
    from: vi
      .fn()
      .mockReturnValueOnce(lookup)
      .mockReturnValue({ update: updateFn }),
  };
  const app = {
    select: vi.fn(() => app),
    eq: vi.fn(() => app),
    single: vi.fn(() =>
      Promise.resolve({
        data: {
          app_id: 'app',
          app_secret: 'secret',
          provider: 'pinterest',
          project_id: projectId,
        },
        error: null,
      }),
    ),
  };
  const supabase = {
    supabaseClient: client,
    supabaseServiceRole: { from: vi.fn(() => app) },
  };
  const service = new PinterestService(
    supabase as unknown as SupabaseService,
    { get: () => 'https://api.example.com/' } as unknown as ConfigService,
    { path: '/v1/pinterest/boards/account_1' } as Request,
  );
  const get = vi
    .spyOn(axios, 'get')
    .mockResolvedValue({ data: { items: [], bookmark: null } });
  const post = vi.spyOn(axios, 'post');
  return {
    service,
    get,
    post,
    lookup,
    app,
    update,
    updateFn,
    setUpdateError: () => {
      updateError = { message: 'db failed' };
    },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('Pinterest boards', () => {
  it.each(['missing', 'account_1'])(
    'rejects missing/cross-project accounts (%s) before provider calls',
    async (id) => {
      const { service, lookup, app, get, post } = setup();
      await expect(
        service.getBoards(id, 'other-project', { limit: 25 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(lookup.eq).toHaveBeenCalledWith('id', id);
      expect(lookup.eq).toHaveBeenCalledWith('project_id', 'other-project');
      expect(app.single).not.toHaveBeenCalled();
      expect(get).not.toHaveBeenCalled();
      expect(post).not.toHaveBeenCalled();
    },
  );

  it('rejects other platforms before loading credentials', async () => {
    const { service, app, get } = setup({ provider: 'facebook' });
    await expect(
      service.getBoards('account_1', 'project_1', { limit: 25 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(app.single).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });

  it('passes through every board and unknown/nested/nullable field without filtering or transformation', async () => {
    const { service, get } = setup();
    const boards = ['PUBLIC', 'SECRET', 'PROTECTED'].map((privacy, i) => ({
      id: `${i}`,
      name: privacy,
      privacy,
      description: null,
      is_ads_only: true,
      owner: { username: 'someone-else', extra: null },
      media: {
        image_cover_url: null,
        pin_thumbnail_urls: ['url'],
        additional: { foo: [1, null] },
      },
      additional: { can_do_something: false },
    }));
    get.mockResolvedValueOnce({
      data: { items: boards, bookmark: 'next+/=&?' },
    });
    const result = await service.getBoards('account_1', 'project_1', {
      limit: 3,
    });
    expect(result.data).toBe(boards);
    expect(JSON.parse(JSON.stringify(result.data))).toEqual(boards);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('https://api.pinterest.com/v5/boards', {
      headers: { Authorization: 'Bearer old-token' },
      params: { page_size: 3, bookmark: undefined },
    });
    expect(result.meta).toMatchObject({
      cursor: 'next+/=&?',
      limit: 3,
      has_more: true,
    });
    const next = new URL(result.meta.next!);
    expect(next.origin + next.pathname).toBe(
      'https://api.example.com/v1/pinterest/boards/account_1',
    );
    expect(next.searchParams.get('cursor')).toBe('next+/=&?');
    expect(next.searchParams.get('limit')).toBe('3');
  });

  it.each([null, undefined, ''])(
    'forwards the cursor and terminates the final page (%s)',
    async (bookmark) => {
      const { service, get } = setup();
      get.mockResolvedValueOnce({ data: { items: [], bookmark } });
      const result = await service.getBoards('account_1', 'project_1', {
        limit: 25,
        cursor: 'opaque+/=',
      });
      expect(get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { page_size: 25, bookmark: 'opaque+/=' },
        }),
      );
      expect(result).toEqual({
        data: [],
        meta: { cursor: '', limit: 25, has_more: false, next: null },
      });
      expect(get).toHaveBeenCalledTimes(1);
    },
  );

  it('returns a subsequent page and its next bookmark', async () => {
    const { service, get } = setup();
    get.mockResolvedValueOnce({
      data: { items: [{ id: '2', name: 'Board' }], bookmark: 'page3' },
    });
    const result = await service.getBoards('account_1', 'project_1', {
      limit: 1,
      cursor: 'page2',
    });
    expect(result.meta.cursor).toBe('page3');
    expect(result.meta.has_more).toBe(true);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    'refreshes and persists rotated credentials using the correct sandbox setting (%s)',
    async (sandbox) => {
      const { service, post, get, updateFn, update } = setup({
        access_token_expires_at: null,
        social_provider_metadata: { is_sandbox: sandbox },
      });
      post.mockResolvedValueOnce({
        data: {
          access_token: 'new-token',
          refresh_token: 'rotated',
          expires_in: 3600,
        },
      });
      await service.getBoards('account_1', 'project_1', { limit: 25 });
      const base = sandbox
        ? 'https://api-sandbox.pinterest.com/v5'
        : 'https://api.pinterest.com/v5';
      expect(post).toHaveBeenCalledWith(
        `${base}/oauth/token`,
        expect.any(String),
        expect.any(Object),
      );
      expect(get).toHaveBeenCalledWith(
        `${base}/boards`,
        expect.objectContaining({
          headers: { Authorization: 'Bearer new-token' },
        }),
      );
      expect(updateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          access_token: 'new-token',
          refresh_token: 'rotated',
        }),
      );
      expect(update.eq).toHaveBeenCalledWith('id', 'account_1');
      expect(update.eq).toHaveBeenCalledWith('project_id', 'project_1');
    },
  );

  it('stops if credential persistence fails', async () => {
    const { service, post, get, setUpdateError } = setup({
      access_token_expires_at: null,
    });
    setUpdateError();
    post.mockResolvedValueOnce({
      data: { access_token: 'new', refresh_token: 'rotated', expires_in: 3600 },
    });
    await expect(
      service.getBoards('account_1', 'project_1', { limit: 25 }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(get).not.toHaveBeenCalled();
  });

  it.each([400, 401, 403, 429, 500, undefined])(
    'surfaces safe upstream errors (%s), never an empty success page',
    async (status) => {
      const { service, get } = setup();
      get.mockRejectedValueOnce(
        new AxiosError(
          'SECRET token',
          undefined,
          undefined,
          undefined,
          status
            ? ({ status, data: { message: 'SECRET' } } as never)
            : undefined,
        ),
      );
      const error = await service
        .getBoards('account_1', 'project_1', { limit: 25 })
        .catch((error: unknown) => error);
      expect(error).toMatchObject({
        status: status && status < 500 ? status : 502,
      });
      expect(JSON.stringify(error)).not.toContain('SECRET');
    },
  );

  it('does not fetch boards when refresh fails', async () => {
    const { service, post, get } = setup({ access_token_expires_at: null });
    post.mockRejectedValueOnce(
      new AxiosError('SECRET', undefined, undefined, undefined, {
        status: 401,
      } as never),
    );
    await expect(
      service.getBoards('account_1', 'project_1', { limit: 25 }),
    ).rejects.toMatchObject({ status: 401 });
    expect(get).not.toHaveBeenCalled();
  });
});

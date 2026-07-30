import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { buildE2eApp, closeE2eApp } from './utils/build-e2e-app';
import {
  invalidVerifyKeyResponse,
  validVerifyKeyResponse,
  type MockUnkeyClient,
} from './utils/mock-unkey';
import {
  getSeededTestContext,
  type SeededTestContext,
} from './utils/seed-lookup';
import { deleteSocialPostsByIds } from './utils/cleanup';

vi.mock('@trigger.dev/sdk', () => ({
  tasks: { trigger: vi.fn().mockResolvedValue(undefined) },
}));

interface SocialPostResponse {
  id: string;
  caption: string;
  status: string;
}

interface PaginatedSocialPostsResponse {
  data: SocialPostResponse[];
}

describe('Social Posts CRUD (e2e)', () => {
  let app: NestExpressApplication;
  let mockUnkey: MockUnkeyClient;
  let ctx: SeededTestContext;
  let createdPostIds: string[] = [];

  beforeAll(async () => {
    ({ app, mockUnkey } = await buildE2eApp());
    ctx = await getSeededTestContext();
  });

  afterEach(async () => {
    await deleteSocialPostsByIds(createdPostIds);
    createdPostIds = [];
  });

  afterAll(async () => {
    await closeE2eApp(app);
  });

  function authAsUser1() {
    mockUnkey.keys.verifyKey.mockResolvedValueOnce(
      validVerifyKeyResponse({
        userId: ctx.userIds.user1,
        projectId: ctx.projectId,
        teamId: ctx.teamId,
        planType: 'legacy',
      }),
    );
  }

  function minimalPayload(overrides: Record<string, unknown> = {}) {
    return {
      caption: 'e2e test post',
      isDraft: true,
      external_id: null,
      media: null,
      platform_configurations: null,
      account_configurations: null,
      social_accounts: [ctx.facebookConnectionId],
      ...overrides,
    };
  }

  it('rejects requests with no bearer token', async () => {
    await request(app.getHttpServer()).get('/v1/social-posts').expect(401);
  });

  it('rejects requests when Unkey reports the key as invalid', async () => {
    mockUnkey.keys.verifyKey.mockResolvedValueOnce(invalidVerifyKeyResponse());

    await request(app.getHttpServer())
      .get('/v1/social-posts')
      .set('Authorization', 'Bearer whatever')
      .expect(401);
  });

  it('creates, reads, lists, updates, and deletes a post', async () => {
    authAsUser1();
    const createRes = await request(app.getHttpServer())
      .post('/v1/social-posts')
      .set('Authorization', 'Bearer test-token')
      .send(minimalPayload())
      .expect(201);

    const created = createRes.body as SocialPostResponse;
    createdPostIds.push(created.id);
    expect(created).toMatchObject({
      caption: 'e2e test post',
      status: 'draft',
    });

    authAsUser1();
    const getRes = await request(app.getHttpServer())
      .get(`/v1/social-posts/${created.id}`)
      .set('Authorization', 'Bearer test-token')
      .expect(200);
    expect((getRes.body as SocialPostResponse).id).toBe(created.id);

    authAsUser1();
    const listRes = await request(app.getHttpServer())
      .get('/v1/social-posts')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
    const list = listRes.body as PaginatedSocialPostsResponse;
    expect(list.data.some((post) => post.id === created.id)).toBe(true);

    authAsUser1();
    const updateRes = await request(app.getHttpServer())
      .put(`/v1/social-posts/${created.id}`)
      .set('Authorization', 'Bearer test-token')
      .send(minimalPayload({ caption: 'updated e2e caption' }))
      .expect(200);
    expect((updateRes.body as SocialPostResponse).caption).toBe(
      'updated e2e caption',
    );

    authAsUser1();
    await request(app.getHttpServer())
      .delete(`/v1/social-posts/${created.id}`)
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    authAsUser1();
    await request(app.getHttpServer())
      .get(`/v1/social-posts/${created.id}`)
      .set('Authorization', 'Bearer test-token')
      .expect(404);
  });

  it("returns 404 for a post visible to the owner but outside a non-member user's RLS access", async () => {
    authAsUser1();
    const createRes = await request(app.getHttpServer())
      .post('/v1/social-posts')
      .set('Authorization', 'Bearer test-token')
      .send(minimalPayload())
      .expect(201);
    const created = createRes.body as SocialPostResponse;
    createdPostIds.push(created.id);

    // user5 is seeded but was never added to "Example Team" — blocked by
    // user_has_project_access() (RLS), not by the controller's own
    // project_id filter, since we pass the real project id here.
    mockUnkey.keys.verifyKey.mockResolvedValueOnce(
      validVerifyKeyResponse({
        userId: ctx.userIds.user5,
        projectId: ctx.projectId,
        teamId: ctx.teamId,
      }),
    );
    await request(app.getHttpServer())
      .get(`/v1/social-posts/${created.id}`)
      .set('Authorization', 'Bearer test-token')
      .expect(404);
  });
});

import { api, V1, expectStatus, requirePrereq } from './lib/http';
import {
  createTestSocialAccount,
  TEST_CAPTION,
  testExternalId,
} from './lib/fixtures';
import type { DeleteResponse, Paginated, SocialPost } from './lib/types';

/**
 * Social Posts — `src/social-posts/social-posts.controller.ts`
 *
 * Full CRUD lifecycle, one endpoint per `it()`. Every post is created with
 * `isDraft: true` so the API never actually publishes anything to a social
 * platform — drafts are not processed.
 *
 * `beforeAll` upserts a dummy social account because the create/update
 * endpoints validate that every `social_accounts` id is owned by the project.
 */
describe('Social Posts API', () => {
  let accountId: string;
  let postId: string | undefined;
  const externalId = testExternalId('post');

  beforeAll(async () => {
    const account = await createTestSocialAccount();
    accountId = account.id;
  });

  afterAll(async () => {
    // Best-effort cleanup in case the DELETE test never ran (e.g. create failed).
    if (postId) {
      await api.delete(`${V1}/social-posts/${postId}`).catch(() => undefined);
    }
  });

  it('POST /v1/social-posts — creates a draft post', async () => {
    const res = await api.post<SocialPost>(`${V1}/social-posts`, {
      caption: TEST_CAPTION,
      social_accounts: [accountId],
      external_id: externalId,
      media: null,
      isDraft: true,
    });

    expectStatus(res, 200, 201);
    expect(typeof res.body.id).toBe('string');
    expect(res.body.caption).toBe(TEST_CAPTION);
    expect(res.body.status).toBe('draft');
    expect(res.body.social_accounts.map((a) => a.id)).toContain(accountId);

    postId = res.body.id;
  });

  it('GET /v1/social-posts — lists posts (paginated)', async () => {
    const res = await api.get<Paginated<SocialPost>>(`${V1}/social-posts`, {
      query: { limit: 50 },
    });

    expectStatus(res, 200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        offset: expect.any(Number),
        limit: expect.any(Number),
      }),
    );
  });

  it('GET /v1/social-posts/:id — fetches the created post', async () => {
    const id = requirePrereq(postId, 'created post id');
    const res = await api.get<SocialPost>(`${V1}/social-posts/${id}`);

    expectStatus(res, 200);
    expect(res.body.id).toBe(id);
    expect(res.body.external_id).toBe(externalId);
    expect(res.body.status).toBe('draft');
  });

  it('GET /v1/social-posts/:id — returns 404 for an unknown id', async () => {
    const res = await api.get(`${V1}/social-posts/sp_pfm_integration_missing`);

    expectStatus(res, 404);
  });

  it('PUT /v1/social-posts/:id — updates the draft post', async () => {
    const id = requirePrereq(postId, 'created post id');
    const updatedCaption = `${TEST_CAPTION} (updated)`;

    const res = await api.put<SocialPost>(`${V1}/social-posts/${id}`, {
      caption: updatedCaption,
      social_accounts: [accountId],
      external_id: externalId,
      media: null,
      isDraft: true,
    });

    expectStatus(res, 200);
    expect(res.body.id).toBe(id);
    expect(res.body.caption).toBe(updatedCaption);
    expect(res.body.status).toBe('draft');
  });

  it('DELETE /v1/social-posts/:id — deletes the draft post', async () => {
    const id = requirePrereq(postId, 'created post id');
    const res = await api.delete<DeleteResponse>(`${V1}/social-posts/${id}`);

    expectStatus(res, 200);
    expect(res.body.success).toBe(true);

    // Mark as cleaned up so afterAll doesn't double-delete.
    postId = undefined;

    // It should now be gone.
    const getRes = await api.get(`${V1}/social-posts/${id}`);
    expectStatus(getRes, 404);
  });
});

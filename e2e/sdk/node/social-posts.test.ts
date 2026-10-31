import {
  client,
  createTestSocialAccount,
  expectApiError,
  requirePrereq,
  TEST_CAPTION,
  testExternalId,
} from './lib/client';

/**
 * SDK: Social Posts — `client.socialPosts.*`
 *
 * Full CRUD lifecycle through the SDK: create, list, retrieve, update, delete.
 * Posts are created with `isDraft: true` so nothing is ever published.
 * `beforeAll` upserts a dummy social account (via the SDK) because create/update
 * require every `social_accounts` id to be owned by the project.
 */
describe('SDK (post-for-me): Social Posts', () => {
  let accountId: string;
  let postId: string | undefined;
  const externalId = testExternalId('post');

  beforeAll(async () => {
    const account = await createTestSocialAccount();
    accountId = account.id;
  });

  afterAll(async () => {
    if (postId) {
      await client()
        .socialPosts.delete(postId)
        .catch(() => undefined);
    }
  });

  it('client.socialPosts.create() — creates a draft post', async () => {
    const post = await client().socialPosts.create({
      caption: TEST_CAPTION,
      social_accounts: [accountId],
      external_id: externalId,
      isDraft: true,
    });

    expect(typeof post.id).toBe('string');
    expect(post.caption).toBe(TEST_CAPTION);
    expect(post.status).toBe('draft');
    expect(post.social_accounts.map((a) => a.id)).toContain(accountId);

    postId = post.id;
  });

  it('client.socialPosts.list() — returns a paginated page', async () => {
    const page = await client().socialPosts.list({ limit: 50 });

    expect(Array.isArray(page.data)).toBe(true);
    expect(page.meta).toEqual(
      expect.objectContaining({ limit: expect.any(Number) }),
    );
  });

  it('client.socialPosts.retrieve(id) — fetches the created post', async () => {
    const id = requirePrereq(postId, 'created post id');
    const post = await client().socialPosts.retrieve(id);

    expect(post.id).toBe(id);
    expect(post.external_id).toBe(externalId);
    expect(post.status).toBe('draft');
  });

  it('client.socialPosts.retrieve(id) — rejects with 404 for an unknown id', async () => {
    await expectApiError(
      client().socialPosts.retrieve('sp_pfm_e2e_missing'),
      404,
    );
  });

  it('client.socialPosts.update(id, {...}) — updates the draft post', async () => {
    const id = requirePrereq(postId, 'created post id');
    const updatedCaption = `${TEST_CAPTION} (updated)`;

    const post = await client().socialPosts.update(id, {
      caption: updatedCaption,
      social_accounts: [accountId],
      external_id: externalId,
      isDraft: true,
    });

    expect(post.id).toBe(id);
    expect(post.caption).toBe(updatedCaption);
    expect(post.status).toBe('draft');
  });

  it('client.socialPosts.delete(id) — deletes the draft post', async () => {
    const id = requirePrereq(postId, 'created post id');
    const res = await client().socialPosts.delete(id);

    expect(res.success).toBe(true);
    postId = undefined;

    // It should now be gone.
    await expectApiError(client().socialPosts.retrieve(id), 404);
  });
});

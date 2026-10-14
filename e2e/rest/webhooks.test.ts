import { api, V1, expectStatus, requirePrereq } from './lib/http';
import type { DeleteResponse, Paginated, Webhook } from './lib/types';

/**
 * Webhooks — `src/webhooks/webhooks.controller.ts`
 *
 * Fully self-contained CRUD lifecycle, one endpoint per `it()`. Each run
 * creates a throwaway webhook pointing at example.com and deletes it again, so
 * the demo project is left exactly as it was found.
 */
describe('Webhooks API', () => {
  let webhookId: string | undefined;
  const url = `https://example.com/pfm-integration-test/${Date.now()}`;

  afterAll(async () => {
    // Best-effort cleanup if the DELETE test never ran.
    if (webhookId) {
      await api.delete(`${V1}/webhooks/${webhookId}`).catch(() => undefined);
    }
  });

  it('POST /v1/webhooks — creates a webhook', async () => {
    const res = await api.post<Webhook>(`${V1}/webhooks`, {
      url,
      event_types: ['social.post.created', 'social.post.updated'],
    });

    expectStatus(res, 200, 201);
    expect(typeof res.body.id).toBe('string');
    expect(res.body.url).toBe(url);
    expect(res.body.event_types).toEqual(
      expect.arrayContaining(['social.post.created', 'social.post.updated']),
    );

    webhookId = res.body.id;
  });

  it('GET /v1/webhooks — lists webhooks (paginated)', async () => {
    const res = await api.get<Paginated<Webhook>>(`${V1}/webhooks`, {
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

    const id = requirePrereq(webhookId, 'created webhook id');
    expect(res.body.data.some((w) => w.id === id)).toBe(true);
  });

  it('GET /v1/webhooks/:id — fetches the created webhook', async () => {
    const id = requirePrereq(webhookId, 'created webhook id');
    const res = await api.get<Webhook>(`${V1}/webhooks/${id}`);

    expectStatus(res, 200);
    expect(res.body.id).toBe(id);
    expect(res.body.url).toBe(url);
  });

  it('GET /v1/webhooks/:id — returns 404 for an unknown id', async () => {
    const res = await api.get(`${V1}/webhooks/wbh_pfm_integration_missing`);

    expectStatus(res, 404);
  });

  it('PATCH /v1/webhooks/:id — updates the webhook', async () => {
    const id = requirePrereq(webhookId, 'created webhook id');
    const updatedUrl = `${url}/updated`;

    const res = await api.patch<Webhook>(`${V1}/webhooks/${id}`, {
      url: updatedUrl,
      event_types: ['social.post.deleted'],
    });

    expectStatus(res, 200);
    expect(res.body.id).toBe(id);
    expect(res.body.url).toBe(updatedUrl);
  });

  it('DELETE /v1/webhooks/:id — deletes the webhook', async () => {
    const id = requirePrereq(webhookId, 'created webhook id');
    const res = await api.delete<DeleteResponse>(`${V1}/webhooks/${id}`);

    expectStatus(res, 200);
    expect(res.body.success).toBe(true);

    webhookId = undefined;

    // It should now 404.
    const getRes = await api.get(`${V1}/webhooks/${id}`);
    expectStatus(getRes, 404);
  });
});

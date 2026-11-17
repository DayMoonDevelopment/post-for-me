import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { buildE2eApp, closeE2eApp } from './utils/build-e2e-app';

// HealthcheckService checks connectivity via KyselyService (direct Postgres),
// not the Supabase/PostgREST/RLS layer — the social-posts suite covers that.
describe('GET /healthcheck (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    ({ app } = await buildE2eApp());
  });

  afterAll(async () => {
    await closeE2eApp(app);
  });

  it('returns 200 { status: "ok" } when the database is reachable', async () => {
    const res = await request(app.getHttpServer()).get('/healthcheck');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('is version-neutral (no /v1 prefix)', async () => {
    await request(app.getHttpServer()).get('/v1/healthcheck').expect(404);
  });
});

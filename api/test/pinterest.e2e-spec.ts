import 'reflect-metadata';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import type { Server } from 'http';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { PinterestModule } from '../src/pinterest/pinterest.module';
import { PinterestService } from '../src/pinterest/pinterest.service';
import { SupabaseModule } from '../src/supabase/supabase.module';
import { SupabaseService } from '../src/supabase/supabase.service';

describe('Pinterest boards HTTP contract', () => {
  let app: INestApplication<Server>;
  const getBoards = vi.fn();
  const principal = JSON.stringify({
    version: 'v1',
    subject: 'key_1',
    type: 'API_KEY',
    identity: { externalId: 'project_1' },
    source: {
      key: {
        keyId: 'key_1',
        keySpaceId: 'space_1',
        meta: { created_by: 'user_1', team_id: 'team_1' },
      },
    },
  });
  const path = '/v1/pinterest/boards/account_1';

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [SupabaseModule, PinterestModule],
    })
      .overrideProvider(SupabaseService)
      .useValue({ setUser: vi.fn() })
      .overrideProvider(PinterestService)
      .useValue({ getBoards })
      .compile();
    app = module.createNestApplication();
    (app as NestExpressApplication).set('query parser', 'extended');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });
  beforeEach(() => getBoards.mockReset());
  afterAll(async () => {
    await app?.close();
  });

  it('uses the existing authentication guard and rejects missing authentication', async () => {
    await request(app.getHttpServer()).get(path).expect(401);
    expect(getBoards).not.toHaveBeenCalled();
  });

  it('passes the authenticated project and defaults, preserving the JSON board payload', async () => {
    const response = {
      data: [
        {
          id: '123',
          name: 'Board',
          description: null,
          owner: { username: 'owner', unknown: 4 },
          media: null,
          additional: { nested: [null, false] },
        },
      ],
      meta: { limit: 25, cursor: '', next: null, has_more: false },
    };
    getBoards.mockResolvedValue(response);
    const result = await request(app.getHttpServer())
      .get(path)
      .set('x-unkey-principal', principal)
      .expect(200);
    expect(result.body).toEqual(response);
    expect(getBoards).toHaveBeenCalledWith('account_1', 'project_1', {
      limit: 25,
    });
  });

  it('transforms and forwards supported pagination parameters', async () => {
    getBoards.mockResolvedValue({ data: [], meta: {} });
    await request(app.getHttpServer())
      .get(path)
      .query({ limit: 250, cursor: 'opaque+/=' })
      .set('x-unkey-principal', principal)
      .expect(200);
    expect(getBoards).toHaveBeenCalledWith('account_1', 'project_1', {
      limit: 250,
      cursor: 'opaque+/=',
    });
  });

  it.each([
    'limit=0',
    'limit=251',
    'limit=1.5',
    'limit=invalid',
    'cursor[nested]=bad',
    'cursor=a&cursor=b',
  ])('rejects invalid pagination: %s', async (query) => {
    await request(app.getHttpServer())
      .get(`${path}?${query}`)
      .set('x-unkey-principal', principal)
      .expect(400);
    expect(getBoards).not.toHaveBeenCalled();
  });

  it('includes the route, authentication, pagination and upstream board schema in public OpenAPI', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
      { include: [PinterestModule] },
    );
    const operation =
      document.paths['/v1/pinterest/boards/{social_account_id}'].get!;
    expect(operation.security).toEqual([{ bearer: [] }]);
    expect(operation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'cursor', in: 'query' }),
        expect.objectContaining({ name: 'limit', in: 'query' }),
      ]),
    );
    const schemas = document.components!.schemas!;
    expect(schemas.PinterestBoardDto).toMatchObject({
      required: ['id', 'name'],
      properties: {
        id: { type: 'string' },
        description: { type: 'string', nullable: true },
        collaborator_count: { type: 'integer' },
        owner: {
          allOf: [{ $ref: '#/components/schemas/PinterestBoardOwnerDto' }],
        },
        media: {
          allOf: [{ $ref: '#/components/schemas/PinterestBoardMediaDto' }],
        },
      },
    });
    expect(schemas.PinterestBoardMediaDto).toMatchObject({
      properties: {
        image_cover_url: { type: 'string', nullable: true },
        pin_thumbnail_urls: { type: 'array', items: { type: 'string' } },
      },
    });
    expect(schemas.PinterestBoardDto).not.toHaveProperty(
      'properties.can_publish',
    );
  });
});

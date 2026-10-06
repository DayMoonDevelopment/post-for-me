import type { ExecutionContext } from '@nestjs/common';
import { HttpException, ValidationPipe, VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as request from 'supertest';
import { AuthGuard } from '../auth/auth.guard';
import { PlatformAudioController } from './platform-audio.controller';
import { PlatformAudioService } from './platform-audio.service';

describe('PlatformAudioController HTTP boundary', () => {
  let app: NestExpressApplication;
  const getPlatformAudio = jest.fn();
  let authorized = true;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PlatformAudioController],
      providers: [
        { provide: PlatformAudioService, useValue: { getPlatformAudio } },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          context.switchToHttp().getRequest<{ user: unknown }>().user = {
            id: 'user-1',
            projectId: 'project-1',
          };
          return authorized;
        },
      })
      .compile();
    app = module.createNestApplication<NestExpressApplication>(
      new ExpressAdapter(),
    );
    app.set('query parser', 'extended');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  beforeEach(() => {
    authorized = true;
    getPlatformAudio.mockReset().mockResolvedValue({
      data: [],
      meta: { count: 0, has_more: false, next: null },
    });
  });
  afterAll(async () => {
    await app.close();
  });

  it('requires the existing auth guard', async () => {
    authorized = false;
    await request(app.getHttpServer())
      .get('/v1/platform-audio/sa_123')
      .expect(403);
    expect(getPlatformAudio).not.toHaveBeenCalled();
  });

  it('passes the authenticated project and validated nested filters', async () => {
    await request(app.getHttpServer())
      .get('/v1/platform-audio/sa_123')
      .query({ 'platform_configurations[instagram][search_query]': 'birthday' })
      .expect(200, {
        data: [],
        meta: { count: 0, has_more: false, next: null },
      });
    expect(getPlatformAudio).toHaveBeenCalledWith({
      accountId: 'sa_123',
      projectId: 'project-1',
      query: {
        platform_configurations: {
          instagram: { audio_type: 'music', search_query: 'birthday' },
        },
      },
    });
  });

  it.each([
    { access_token: 'secret' },
    { projectId: 'another-project' },
    { cursor: 'invented' },
    { 'platform_configurations[instagram][audio_type]': 'invalid' },
    { 'platform_configurations[instagram][access_token]': 'secret' },
    { 'platform_configurations[tiktok_business][country_code]': 'ZZ' },
    { 'platform_configurations[tiktok_business][search_query]': 'unsupported' },
    { 'platform_configurations[facebook][search_query]': 'unsupported' },
    { platform_configurations: 'not-an-object' },
  ])('rejects malformed or unsupported query %j', async (query) => {
    await request(app.getHttpServer())
      .get('/v1/platform-audio/sa_123')
      .query(query)
      .expect(400);
    expect(getPlatformAudio).not.toHaveBeenCalled();
  });

  it.each([400, 404, 502])(
    'preserves asynchronous service errors with status %s',
    async (status) => {
      getPlatformAudio.mockRejectedValue(
        new HttpException('Safe error', status),
      );
      const result = await request(app.getHttpServer())
        .get('/v1/platform-audio/sa_123')
        .expect(status);
      expect(result.body).toMatchObject({ message: 'Safe error' });
    },
  );

  it.each(['post', 'put', 'patch', 'delete'] as const)(
    'does not expose %s',
    async (method) => {
      await request(app.getHttpServer())
        [method]('/v1/platform-audio/sa_123')
        .expect(404);
      expect(getPlatformAudio).not.toHaveBeenCalled();
    },
  );

  it('registers a GET-only authenticated Swagger operation with resolved provider schemas', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    const path = document.paths['/v1/platform-audio/{social_account_id}'];
    expect(Object.keys(path)).toEqual(['get']);
    expect(path.get?.security).toEqual([{ bearer: [] }]);
    expect(document.components?.schemas).toHaveProperty(
      'InstagramAudioPlatformDataDto',
    );
    expect(document.components?.schemas).toHaveProperty(
      'TikTokBusinessAudioPlatformDataDto',
    );
    expect(path.get?.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/PlatformAudioResponseDto' },
        },
      },
    });
  });
});

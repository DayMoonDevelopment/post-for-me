import '../../src/instrument';

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from '../../src/app.module';

export async function buildE2eApp(): Promise<{
  app: NestExpressApplication;
}> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>();

  // Mirror the request-affecting bootstrap steps from src/main.ts. Not
  // mirrored: Swagger/Scalar docs setup, the "/" -> /docs redirect, and
  // static assets — none of those affect API behavior under test.
  app.set('query parser', 'extended');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  await app.init();

  return { app };
}

export async function closeE2eApp(
  app: NestExpressApplication | undefined,
): Promise<void> {
  // beforeAll may have thrown before `app` was assigned — afterAll still
  // runs, so guard against that instead of masking the real failure.
  if (!app) {
    return;
  }
  await app.close();
}

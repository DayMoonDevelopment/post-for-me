import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

import { AppModule } from './app.module';

import { mediaControllerDescription } from './media/docs/media-controller.md';
import { postsControllerDescription } from './social-posts/docs/posts-controller.md';
import { socialAccountsControllerDescription } from './social-provider-connections/docs/social-accounts-controller';
import { postResultsControllerDescription } from './social-post-results/docs/post-results-controller.md';
import { join } from 'path';
import { gettingStartedDescription } from './getting-started.md';

import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { webhookControllerDescription } from './webhooks/docs/webhooks-controller.md';
import { socialPostPreviewControllerDescription } from './social-posts-previews/docs/social-posts-preview-controller.md';
import { socialAccountFeedsControllerDescription } from './social-account-feeds/docs/social-account-feeds-controller.md';

async function bootstrap() {
  const app: NestExpressApplication = await NestFactory.create(AppModule);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const config = new DocumentBuilder()
    .setTitle('Post for Me API')
    .setDescription(gettingStartedDescription)
    .addTag('Media', mediaControllerDescription)
    .addTag('Social Posts', postsControllerDescription)
    .addTag('Social Accounts', socialAccountsControllerDescription)
    .addTag('Social Post Results', postResultsControllerDescription)
    .addTag('Social Account Feeds', socialAccountFeedsControllerDescription)
    .addTag('Webhooks', webhookControllerDescription)
    .addTag('Social Post Previews', socialPostPreviewControllerDescription)
    .setVersion('1.0')
    .addBearerAuth()
    .setTermsOfService('https://www.postforme.dev/terms')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('swagger', app, document);

  app.use(
    '/docs',
    apiReference({
      content: document,
      theme: 'default',
      customfavIcon: '/favicon.ico',
      metaData: {
        title: 'Post for Me API',
      },
    }),
  );

  app.use('/', (req: Request, res: Response, next: NextFunction) => {
    if (req.url === '/') {
      return res.redirect(301, '/docs');
    }
    next();
  });

  app.useStaticAssets(join(__dirname, '..', 'public'));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Automatically transforms payloads to DTO instances and performs type conversion
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();

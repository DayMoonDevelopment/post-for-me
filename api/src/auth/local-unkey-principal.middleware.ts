import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/**
 * Local stand-in for the Unkey gateway. In every real environment, Unkey
 * verifies the caller's API key and injects `X-Unkey-Principal` before the
 * request reaches this app (see unkey-principal.ts). Nothing does that on
 * `bun run start:dev`, so every `@Protect()` / `@VerifyKey()` route 401s
 * unless a caller sets the header by hand.
 *
 * Enabled only when LOCAL_UNKEY_PRINCIPAL=true AND NODE_ENV !== 'production'
 * — never enable this outside local dev, it bypasses real authentication.
 * A caller-supplied header always wins, so `curl -H "X-Unkey-Principal:
 * ..."` still lets you test other principals against the same server.
 */
@Injectable()
export class LocalUnkeyPrincipalMiddleware implements NestMiddleware {
  private static warned = false;

  use(req: Request, _res: Response, next: NextFunction) {
    if (req.headers['x-unkey-principal']) {
      return next();
    }

    if (!LocalUnkeyPrincipalMiddleware.warned) {
      Logger.warn(
        'Injecting a hardcoded X-Unkey-Principal for local development ' +
          '(LOCAL_UNKEY_PRINCIPAL=true). This must never be enabled outside local dev.',
        'LocalUnkeyPrincipalMiddleware',
      );
      LocalUnkeyPrincipalMiddleware.warned = true;
    }

    req.headers['x-unkey-principal'] = JSON.stringify({
      version: 'v1',
      subject: 'local-dev',
      type: 'API_KEY',
      identity: {
        externalId: process.env.LOCAL_UNKEY_PROJECT_ID,
      },
      source: {
        key: {
          keyId: 'local_dev_key',
          keySpaceId: 'local_dev',
          meta: {
            created_by: process.env.LOCAL_UNKEY_USER_ID,
            team_id: process.env.LOCAL_UNKEY_TEAM_ID,
            plan_type: process.env.LOCAL_UNKEY_PLAN_TYPE || 'new_pricing',
          },
          roles: ['admin'],
          permissions: ['cms.read', 'cms.write'],
        },
      },
    });

    next();
  }
}

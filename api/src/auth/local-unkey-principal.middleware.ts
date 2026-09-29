import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import type { UnkeyPrincipal } from './unkey-principal';

type UnkeyClient = {
  keys: {
    verifyKey: (input: { key: string }) => Promise<{
      data: {
        valid: boolean;
        keyId?: string;
        name?: string;
        meta?: Record<string, unknown>;
        expires?: number;
        credits?: number;
        roles?: string[];
        permissions?: string[];
        identity?: {
          externalId: string;
          meta?: Record<string, unknown>;
        };
      };
    }>;
  };
};

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
  private static unkeyClientPromise: Promise<UnkeyClient | null> | null = null;

  async use(req: Request, _res: Response, next: NextFunction) {
    if (req.headers['x-unkey-principal']) {
      return next();
    }

    const apiKey = this.getApiKeyFromAuthorizationHeader(req);
    if (!apiKey) {
      return next();
    }

    const unkeyClient = await this.getUnkeyClient();
    if (!unkeyClient) {
      return next();
    }

    if (!LocalUnkeyPrincipalMiddleware.warned) {
      Logger.warn(
        'Injecting X-Unkey-Principal from Authorization header using Unkey verification ' +
          '(LOCAL_UNKEY_PRINCIPAL=true). This must never be enabled outside local dev.',
        'LocalUnkeyPrincipalMiddleware',
      );
      LocalUnkeyPrincipalMiddleware.warned = true;
    }

    try {
      const { data } = await unkeyClient.keys.verifyKey({ key: apiKey });

      if (!data.valid) {
        return next();
      }

      req.headers['x-unkey-principal'] = JSON.stringify(
        this.toUnkeyPrincipal(data),
      );
    } catch (error) {
      Logger.error(
        'Failed to verify local Authorization header against Unkey.',
        error instanceof Error ? error.stack : undefined,
        'LocalUnkeyPrincipalMiddleware',
      );
    }

    next();
  }

  private async getUnkeyClient(): Promise<UnkeyClient | null> {
    if (!LocalUnkeyPrincipalMiddleware.unkeyClientPromise) {
      LocalUnkeyPrincipalMiddleware.unkeyClientPromise =
        this.createUnkeyClient();
    }

    return LocalUnkeyPrincipalMiddleware.unkeyClientPromise;
  }

  private async createUnkeyClient(): Promise<UnkeyClient | null> {
    const rootKey = process.env.UNKEY_ROOT_KEY;

    if (!rootKey) {
      Logger.warn(
        'UNKEY_ROOT_KEY is missing; local principal injection is disabled.',
        'LocalUnkeyPrincipalMiddleware',
      );
      return null;
    }

    const { Unkey } = await import('@unkey/api');

    return new Unkey({ rootKey });
  }

  private getApiKeyFromAuthorizationHeader(req: Request): string | null {
    const headerValue: unknown = req.headers.authorization;

    if (Array.isArray(headerValue)) {
      const firstHeaderValue = (headerValue as unknown[])[0];

      if (typeof firstHeaderValue !== 'string') {
        return null;
      }

      return this.extractApiKey(firstHeaderValue);
    }

    if (typeof headerValue !== 'string') {
      return null;
    }

    return this.extractApiKey(headerValue);
  }

  private extractApiKey(rawHeader: string): string | null {
    const trimmed = rawHeader.trim();
    if (trimmed.length === 0) {
      return null;
    }

    if (trimmed.toLowerCase().startsWith('bearer ')) {
      const bearerToken = trimmed.slice(7).trim();
      return bearerToken.length > 0 ? bearerToken : null;
    }

    return trimmed;
  }

  private toUnkeyPrincipal(data: {
    keyId?: string;
    name?: string;
    meta?: Record<string, unknown>;
    expires?: number;
    credits?: number;
    roles?: string[];
    permissions?: string[];
    identity?: {
      externalId: string;
      meta?: Record<string, unknown>;
    };
  }): UnkeyPrincipal {
    return {
      version: 'v1',
      subject: data.keyId ?? 'local-dev',
      type: 'API_KEY',
      identity: data.identity
        ? {
            externalId: data.identity.externalId,
            meta: data.identity.meta,
          }
        : undefined,
      source: {
        key: {
          keyId: data.keyId ?? 'local_dev_key',
          keySpaceId: process.env.LOCAL_UNKEY_KEYSPACE_ID || 'local_dev',
          name: data.name,
          expiresAt: data.expires,
          credits: data.credits,
          meta: data.meta ?? {},
          roles: data.roles,
          permissions: data.permissions,
        },
      },
    };
  }
}

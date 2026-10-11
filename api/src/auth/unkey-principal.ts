import type { Request } from 'express';

type JsonObject = Record<string, unknown>;

export interface UnkeyPrincipal {
  version: string;
  subject: string;
  type: string;
  identity?: {
    externalId?: string;
    meta?: JsonObject;
  };
  source?: {
    key?: {
      keyId: string;
      keySpaceId: string;
      name?: string;
      expiresAt?: number;
      credits?: number;
      meta: JsonObject;
      roles?: string[];
      permissions?: string[];
    };
  };
}

export function getUnkeyPrincipalFromRequest(
  request: Request,
): UnkeyPrincipal | null {
  const headerValue = request.headers['x-unkey-principal'];
  const rawHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (typeof rawHeader !== 'string' || rawHeader.trim().length === 0) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(rawHeader);

    if (!isUnkeyPrincipal(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function getMetaString(
  meta: JsonObject | undefined,
  key: string,
): string | undefined {
  if (!meta) {
    return undefined;
  }

  const value = meta[key];

  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }

  return value;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUnkeyPrincipal(value: unknown): value is UnkeyPrincipal {
  if (!isJsonObject(value)) {
    return false;
  }

  return (
    typeof value.version === 'string' &&
    typeof value.subject === 'string' &&
    typeof value.type === 'string'
  );
}

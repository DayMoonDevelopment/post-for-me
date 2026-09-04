import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';

const MAX_DEPTH = 6;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof Buffer)
  );
}

function normalizePlatformValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }

  if (Array.isArray(value)) {
    const items = value as unknown[];
    return items.map((item) =>
      typeof item === 'string' ? item.trim().toLowerCase() : item,
    );
  }

  return value;
}

export function normalizePlatformFields(value: unknown, depth = 0): unknown {
  if (depth >= MAX_DEPTH) {
    return value;
  }

  if (Array.isArray(value)) {
    const items = value as unknown[];
    return items.map((item) => normalizePlatformFields(item, depth + 1));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (key === 'platform') {
      result[key] = normalizePlatformValue(val);
    } else {
      result[key] = normalizePlatformFields(val, depth + 1);
    }
  }

  return result;
}

@Injectable()
export class NormalizePlatformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    if (request.body) {
      request.body = normalizePlatformFields(request.body);
    }

    if (request.query) {
      const normalizedQuery = normalizePlatformFields(request.query);
      // Express 5 exposes `req.query` as a getter that re-parses the URL on
      // every access, so mutating the returned object silently doesn't
      // persist. Redefine the property with a plain value instead.
      Object.defineProperty(request, 'query', {
        value: normalizedQuery,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    return next.handle();
  }
}

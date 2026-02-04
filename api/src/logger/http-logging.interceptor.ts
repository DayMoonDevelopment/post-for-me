import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import crypto from 'crypto';
import type { Request, Response } from 'express';
import { performance } from 'perf_hooks';
import { catchError, finalize, throwError } from 'rxjs';

import { AppLogger } from './app-logger';

function getRequestIp(req: Request): string | undefined {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0]?.trim();
  }
  return req.ip;
}

function shouldSkip(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/docs') ||
    pathname.startsWith('/swagger') ||
    pathname.startsWith('/favicon.ico')
  );
}

function getOrSetRequestId(req: Request, res: Response): string | undefined {
  const incoming = req.headers['x-request-id'];
  const value =
    typeof incoming === 'string' && incoming.length > 0 ? incoming : undefined;

  const id = value || crypto.randomUUID();
  res.setHeader('x-request-id', id);
  return id;
}

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new AppLogger(HttpLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    if (!req || !res) {
      return next.handle();
    }

    const path = req.originalUrl || req.url;
    if (shouldSkip(path)) {
      return next.handle();
    }

    const requestId = getOrSetRequestId(req, res);
    (req as unknown as { requestId?: string }).requestId = requestId;

    const startedAt = performance.now();
    const method = req.method;
    const ip = getRequestIp(req);
    const userId = (req as unknown as { user?: { id?: string } }).user?.id;
    const projectId = (req as unknown as { user?: { projectId?: string } }).user
      ?.projectId;
    const route = (req as unknown as { route?: { path?: unknown } }).route;
    const routePath = typeof route?.path === 'string' ? route.path : undefined;

    let failed = false;

    return next.handle().pipe(
      catchError((err: unknown) => {
        failed = true;
        const statusCode = (err as { status?: number })?.status;
        this.logger.errorWithMeta('request failed', err, {
          'http.method': method,
          'http.route': routePath,
          'http.target': path,
          'http.status_code': statusCode ?? res.statusCode,
          'client.address': ip,
          'enduser.id': userId,
          'postforme.project_id': projectId,
          'http.request_id': requestId,
        });
        return throwError(() => err);
      }),
      finalize(() => {
        if (failed) {
          return;
        }
        const durationMs = performance.now() - startedAt;
        const statusCode = res.statusCode;

        this.logger.info('request completed', {
          'http.method': method,
          'http.route': routePath,
          'http.target': path,
          'http.status_code': statusCode,
          'http.response.duration_ms': Math.round(durationMs),
          'client.address': ip,
          'enduser.id': userId,
          'postforme.project_id': projectId,
          'http.request_id': requestId,
        });
      }),
    );
  }
}

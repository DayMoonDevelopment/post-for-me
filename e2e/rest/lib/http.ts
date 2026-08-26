import { loadEnvFiles, requireEnv } from '../../lib/env';

// Populate process.env from api/.env.local before reading config. This runs
// once per Jest worker, at module import time, before any test executes.
loadEnvFiles();

/** Base URL of the API under test, e.g. `http://localhost:3000`. Required. */
export const API_BASE_URL = requireEnv('API_BASE_URL').replace(/\/+$/, '');

/** URI version prefix. NestJS is configured with `defaultVersion: '1'`. */
export const V1 = '/v1';

// The API key is required for every endpoint except `/healthcheck`. Resolve it
// lazily so a healthcheck-only run can succeed with just API_BASE_URL set.
let cachedApiKey: string | undefined;
export function apiKey(): string {
  if (cachedApiKey === undefined) cachedApiKey = requireEnv('PFM_API_KEY');
  return cachedApiKey;
}

export interface ApiResponse<T = unknown> {
  /** HTTP status code. */
  status: number;
  /** True for 2xx responses. */
  ok: boolean;
  /** Parsed JSON body, or the raw text body if the response was not JSON. */
  body: T;
  /** Response headers. */
  headers: Headers;
  /** Wall-clock round-trip time in milliseconds. */
  durationMs: number;
}

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | boolean | string[] | undefined>;
  /** Send the `Authorization: Bearer` header. Defaults to `true`. */
  auth?: boolean;
  headers?: Record<string, string>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(API_BASE_URL + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(key, String(v));
      } else {
        url.searchParams.append(key, String(value));
      }
    }
  }
  return url.toString();
}

/**
 * Performs a single real HTTP request against the API under test and returns a
 * structured, already-parsed response. Never throws on non-2xx — only on a
 * genuine network/transport failure (so tests can assert on status codes).
 */
export async function request<T = unknown>(
  method: string,
  path: string,
  opts: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { body, query, auth = true, headers = {} } = opts;
  const url = buildUrl(path, query);

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };
  if (auth) finalHeaders.Authorization = `Bearer ${apiKey()}`;
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error(
      `Network error on ${method} ${url}: ${(err as Error).message}\n` +
        `Is the API running and reachable at ${API_BASE_URL}?`,
    );
  }
  const durationMs = Date.now() - started;

  const text = await res.text();
  let parsed: unknown = text;
  const contentType = res.headers.get('content-type') ?? '';
  if (text && contentType.includes('application/json')) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  return {
    status: res.status,
    ok: res.status >= 200 && res.status < 300,
    body: parsed as T,
    headers: res.headers,
    durationMs,
  };
}

export const api = {
  get: <T = unknown>(path: string, opts?: RequestOptions) =>
    request<T>('GET', path, opts),
  post: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('POST', path, { ...opts, body }),
  put: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('PUT', path, { ...opts, body }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('PATCH', path, { ...opts, body }),
  delete: <T = unknown>(path: string, opts?: RequestOptions) =>
    request<T>('DELETE', path, opts),
};

/** Renders a response for inclusion in assertion failure messages. */
export function describeResponse(res: ApiResponse): string {
  const bodyStr =
    typeof res.body === 'string'
      ? res.body
      : JSON.stringify(res.body, null, 2);
  return `  -> HTTP ${res.status} in ${res.durationMs}ms\n${bodyStr}`;
}

/**
 * Asserts the response status is one of `allowed`, throwing an error that
 * includes the full response body — invaluable when an integration test fails
 * against a real server.
 */
export function expectStatus(res: ApiResponse, ...allowed: number[]): void {
  if (!allowed.includes(res.status)) {
    throw new Error(
      `Expected HTTP status ${allowed.join(' or ')}, got ${res.status}\n` +
        describeResponse(res),
    );
  }
}

/**
 * Guards a value produced by an earlier endpoint test in the same suite. If
 * the prerequisite test failed, dependent tests get a clear message instead of
 * a confusing `undefined` error.
 */
export function requirePrereq<T>(value: T | undefined | null, name: string): T {
  if (value === undefined || value === null || value === '') {
    throw new Error(
      `Prerequisite "${name}" is unavailable — an earlier endpoint test in ` +
        `this suite must have failed. Fix that test first.`,
    );
  }
  return value;
}

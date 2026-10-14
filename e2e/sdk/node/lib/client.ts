import PostForMe from 'post-for-me';
import { loadEnvFiles, requireEnv } from '../../../lib/env';

// Populate process.env from e2e/.env.local before reading config. Runs once
// per Jest worker, at import time, before any test executes.
loadEnvFiles();

let cached: PostForMe | undefined;

/**
 * Lazily-constructed `post-for-me` SDK client, pointed at the SAME target the
 * REST suite uses (`API_BASE_URL` + `PFM_API_KEY`).
 *
 * - `baseURL` is the bare origin — the SDK appends the `/v1` version path.
 * - `maxRetries: 0` — in a test we want the API's *first* real response, not a
 *   silently-retried one. (The SDK retries 5xx/network errors twice by default.)
 */
export function client(): PostForMe {
  if (!cached) {
    cached = new PostForMe({
      apiKey: requireEnv('PFM_API_KEY'),
      baseURL: requireEnv('API_BASE_URL'),
      maxRetries: 0,
    });
  }
  return cached;
}

/** Caption stamped on every post created by the SDK suite. */
export const TEST_CAPTION =
  'Post for Me e2e (SDK) test — automated, safe to ignore/delete.';

/** Stable user_id for the SDK suite's shared dummy account (upserted each run). */
export const SDK_FIXTURE_USER_ID = 'pfm-e2e-sdk-fixture';

/** A unique-ish external id for a single test run. */
export function testExternalId(label: string): string {
  return `pfm-e2e-sdk-${label}-${Date.now()}`;
}

/**
 * Creates (or upserts) a dummy social account THROUGH THE SDK, so suites that
 * need an account to exist can bootstrap themselves. Fake credentials — the
 * account is never used to actually publish anything.
 */
export async function createTestSocialAccount(
  opts: { userId?: string; platform?: 'bluesky' } = {},
) {
  return client().socialAccounts.create({
    platform: opts.platform ?? 'bluesky',
    user_id: opts.userId ?? SDK_FIXTURE_USER_ID,
    username: 'pfm-e2e-test',
    access_token: 'pfm-e2e-test-token',
    access_token_expires_at: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  });
}

/**
 * Asserts that an SDK call rejects with one of the allowed HTTP statuses.
 *
 * The `post-for-me` client throws `APIError` (which carries a numeric
 * `.status`) on any non-2xx response — so this is how the SDK suite covers
 * documented error paths like 404s.
 */
export async function expectApiError(
  promise: Promise<unknown>,
  ...allowedStatuses: number[]
): Promise<{ status: number }> {
  try {
    await promise;
  } catch (err) {
    const status = (err as { status?: unknown }).status;
    if (typeof status === 'number' && allowedStatuses.includes(status)) {
      return { status };
    }
    const got =
      typeof status === 'number'
        ? `HTTP ${status}`
        : `${(err as Error)?.constructor?.name ?? 'error'}: ${
            (err as Error)?.message ?? String(err)
          }`;
    throw new Error(
      `Expected the SDK call to reject with HTTP ${allowedStatuses.join(
        ' or ',
      )}, but got ${got}.`,
    );
  }
  throw new Error(
    `Expected the SDK call to reject with HTTP ${allowedStatuses.join(
      ' or ',
    )}, but it resolved successfully.`,
  );
}

/** Guards a value produced by an earlier test in the same suite. */
export function requirePrereq<T>(value: T | undefined | null, name: string): T {
  if (value === undefined || value === null || value === '') {
    throw new Error(
      `Prerequisite "${name}" is unavailable — an earlier test in this ` +
        `suite must have failed. Fix that test first.`,
    );
  }
  return value;
}

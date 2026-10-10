import { createCookie } from "react-router";

import { getActiveSubscriptionInfo } from "~/lib/.server/stripe/subscription";

import { TMP_API_KEY_COOKIE_PREFIX } from "./constants";
import {
  KEY_RATE_LIMITS,
  requireUnkey,
  TEMPORARY_KEY_NAME,
  TEMPORARY_KEY_PREFIX,
} from "./unkey";

const DAY_MS = 24 * 60 * 60 * 1000;
// Cache just under the key's own 24h lifetime so a cached key never outlives it.
const COOKIE_MAX_AGE = 60 * 60 * 23;

/** Why no key could be resolved. `no_subscription` = the active-billing gate. */
export type TemporaryKeyReason = "no_subscription";

export interface TemporaryApiKeyInput {
  projectId: string;
  request: Request;
  /** The team's Stripe customer — read ONLY on a cache miss, to gate + stamp the
   * key's plan metadata. */
  stripeCustomerId: null | string;
  teamId: string;
  userId: string;
}

export interface TemporaryApiKeyResult {
  apiKey: null | string;
  reason?: TemporaryKeyReason;
  /** Set when a fresh key was minted — the caller must append this to the
   * response so the key is cached for subsequent requests. */
  setCookieHeader?: string;
}

/**
 * Resolve a temporary API key for calling the real Post For Me API as the user.
 *
 * Mirrors the legacy `getTemporaryApiKey`: the per-project cookie is checked
 * FIRST and a hit returns immediately — the subscription check (Stripe) and the
 * mint (Unkey) run ONLY on a cache miss. So a warm request pays nothing beyond
 * reading a cookie.
 *
 * On a miss: gate on an active subscription, then mint a short-lived Unkey key
 * (`pfm_tmp`, `externalId = projectId`, team/user/plan meta, 24h, rate-limited)
 * and hand back a Set-Cookie to persist it.
 */
/**
 * `Set-Cookie` headers that expire every cached temporary key on this request.
 *
 * Called on sign-out. The keys themselves stay valid in Unkey until they expire
 * (24h) or a billing change disables them, so leaving the cookies behind would
 * park live project credentials in the browser of someone who has just ended
 * their session — on a shared machine, past the point they'd expect.
 *
 * Nothing is escalated by leaving them: the cookie is `httpOnly`, and
 * `resolveProjectApiClient` re-checks team membership BEFORE the cookie is ever
 * read, so the next user can't reach a project they don't belong to. This is
 * hygiene plus attribution — a reused cookie carries the previous user's
 * `created_by` in the key's metadata.
 *
 * The cookies are per-project (`tmp_api_key_<projectId>`) and we don't know
 * which projects the session touched, so we expire whatever the request carries.
 */
export function expiredTemporaryKeyCookies(request: Request): string[] {
  const header = request.headers.get("cookie");
  if (!header) return [];

  const expired: string[] = [];
  for (const part of header.split(";")) {
    const name = part.trim().split("=")[0];
    if (!name?.startsWith(`${TMP_API_KEY_COOKIE_PREFIX}_`)) continue;
    // Same attributes the cookie was written with — a browser only replaces a
    // cookie when name/path/domain match.
    expired.push(
      `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`,
    );
  }
  return expired;
}

export async function resolveTemporaryApiKey({
  request,
  projectId,
  teamId,
  userId,
  stripeCustomerId,
}: TemporaryApiKeyInput): Promise<TemporaryApiKeyResult> {
  const cookie = createCookie(`${TMP_API_KEY_COOKIE_PREFIX}_${projectId}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
  });

  const cached: unknown = await cookie.parse(request.headers.get("cookie"));
  if (typeof cached === "string" && cached.length > 0) {
    return { apiKey: cached }; // fast path — no Stripe, no Unkey
  }

  // Cache miss: gate on billing, then mint.
  const subscription = await getActiveSubscriptionInfo(stripeCustomerId);
  if (!subscription.active) {
    return { apiKey: null, reason: "no_subscription" };
  }

  const { unkey, apiId } = requireUnkey();
  const created = await unkey.keys.createKey({
    apiId,
    prefix: TEMPORARY_KEY_PREFIX,
    name: TEMPORARY_KEY_NAME,
    externalId: projectId,
    meta: {
      project_id: projectId,
      team_id: teamId,
      created_by: userId,
      ...subscription.planMeta,
    },
    enabled: true,
    recoverable: false,
    expires: Date.now() + DAY_MS,
    ratelimits: KEY_RATE_LIMITS,
  });

  const key = created.data.key;
  return { apiKey: key, setCookieHeader: await cookie.serialize(key) };
}

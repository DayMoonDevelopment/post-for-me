import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createContext } from "react-router";

import type { Database } from "./supabase.types";

/** Supabase client typed against the generated `public` schema. Service
 * adapters use this so `from("teams")` infers columns and the row→DTO mappers
 * are checked against the real schema. */
export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Per-request Supabase client, published by the root middleware and read by
 * everything downstream (route middleware, loaders, actions) via
 * `context.get(supabaseContext)`. One client per request is what lets
 * `@supabase/ssr` own the auth cookies: it reads them off the incoming
 * request and writes refreshed ones back through `setAll`.
 */
export const supabaseContext = createContext<TypedSupabaseClient>();

/**
 * Build a server client wired to a single request/response pair. Cookies the
 * client wants to set (refreshed tokens, sign-in, sign-out) are appended to
 * `responseHeaders`; the root middleware flushes those onto the real response.
 *
 * Never hoist the result to module scope or memoize it across requests: it
 * closes over one request's cookies, so a shared instance would bleed one
 * user's session into another's. One client per request is the safety boundary.
 *
 * Server-side only — there is intentionally no browser client, so the
 * publishable key is read from `process.env` (no `VITE_` prefix) and never
 * reaches the bundle.
 */
export function createSupabaseServerClient(
  request: Request,
  responseHeaders: Headers,
): TypedSupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set to use Supabase auth.",
    );
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "").map(
          (cookie) => ({ name: cookie.name, value: cookie.value ?? "" }),
        );
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          responseHeaders.append(
            "Set-Cookie",
            serializeCookieHeader(name, value, options),
          );
        }
      },
    },
  });
}

/**
 * A **service-role** Supabase client — bypasses RLS and carries no user session.
 *
 * This is the escape hatch for the PUBLIC OAuth callback routes: they run with no
 * signed-in user (the caller is an external provider redirect), yet must read a
 * project's app credentials and write `social_provider_connections` rows across
 * project boundaries. The per-request RLS client (the entity-service bag) can't
 * do that, so those loaders reach for this instead.
 *
 * Powerful and unscoped — construct it ONLY inside the `.server` ops that need it
 * (never publish it into context for every request the way the RLS client is),
 * and never return its raw rows to the client. It uses the `service_role` secret,
 * so it is server-only and must never reach the bundle.
 */
export function createSupabaseServiceRoleClient(): TypedSupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use the service-role client.",
    );
  }

  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Copy any `Set-Cookie` headers the client queued onto an outgoing response. */
export function applySupabaseCookies(from: Headers, to: Headers): void {
  for (const cookie of from.getSetCookie()) {
    to.append("Set-Cookie", cookie);
  }
}

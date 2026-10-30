import type { ErrorKind } from "~/lib/errors";

import { AppException, exceptionForKind } from "./exceptions";

/**
 * Normalizers that wrap a THIRD-PARTY error into an {@link AppException}, mapping the
 * provider's own codes onto our {@link ErrorKind} vocabulary while preserving the
 * original as `cause` (+ the provider detail in `context`). Duck-typed on the
 * error shape rather than importing SDK error classes, so the error layer stays
 * decoupled from the Supabase/Stripe packages.
 *
 * Use these in a catch block (or a service adapter's `if (error) …`) where you
 * KNOW which provider you called; a value that's already an `AppException` (a
 * rethrow) passes straight through.
 */

export interface NormalizeOptions {
  /** Extra structured context merged into the log context. */
  context?: Record<string, unknown>;
  /** Override the user-facing message (else the kind's default copy). */
  publicMessage?: string;
}

function field(error: unknown, key: string): unknown {
  return error && typeof error === "object"
    ? (error as Record<string, unknown>)[key]
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

/** Map a raw HTTP status a provider handed back onto a kind (best-effort). */
function kindForStatus(status: number | undefined): ErrorKind | undefined {
  switch (status) {
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 422:
      return "validation";
    case 429:
      return "rate_limited";
    default:
      return undefined;
  }
}

/**
 * Wrap a Supabase error (PostgREST / Storage / Auth) into an `AppException`. Maps the
 * Postgres/PostgREST `code` (and any HTTP `status`) onto a kind; anything
 * unrecognized from a Supabase call is `upstream` (their service failed us). The
 * raw error survives as `cause`; its `code`/`details`/`hint` go to `context`.
 */
export function fromSupabase(
  error: unknown,
  options: NormalizeOptions = {},
): AppException {
  if (error instanceof AppException) return error;

  const code = asString(field(error, "code"));
  const status =
    asNumber(field(error, "status")) ?? asNumber(field(error, "statusCode"));
  const message = asString(field(error, "message"));
  const details = asString(field(error, "details"));
  const hint = asString(field(error, "hint"));

  let kind: ErrorKind;
  switch (code) {
    case "PGRST116": // .single() matched no rows
      kind = "not_found";
      break;
    case "23505": // unique_violation
    case "23503": // foreign_key_violation
      kind = "conflict";
      break;
    case "23514": // check_violation
      kind = "validation";
      break;
    case "42501": // insufficient_privilege (RLS / permissions)
      kind = "forbidden";
      break;
    default:
      kind = kindForStatus(status) ?? "upstream";
  }

  return exceptionForKind(kind, options.publicMessage, {
    message: message ?? `Supabase error${code ? ` (${code})` : ""}`,
    cause: error,
    context: {
      provider: "supabase",
      code,
      status,
      details,
      hint,
      ...options.context,
    },
  });
}

/**
 * Wrap a Stripe error into an `AppException`, keyed off its `type`. Card / invalid-
 * request problems are `validation` (the caller/user can fix them); auth &
 * permission failures are `internal` (OUR key/config is wrong — never surfaced as
 * the user's fault); connection / API problems are `upstream`.
 */
export function fromStripe(
  error: unknown,
  options: NormalizeOptions = {},
): AppException {
  if (error instanceof AppException) return error;

  const type = asString(field(error, "type"));
  const code = asString(field(error, "code"));
  const statusCode = asNumber(field(error, "statusCode"));
  const message = asString(field(error, "message"));

  let kind: ErrorKind;
  switch (type) {
    case "StripeCardError":
    case "StripeInvalidRequestError":
      kind = "validation";
      break;
    case "StripeRateLimitError":
      kind = "rate_limited";
      break;
    case "StripeAuthenticationError":
    case "StripePermissionError":
      kind = "internal"; // our secret key / permissions — not the user's problem
      break;
    case "StripeConnectionError":
    case "StripeAPIError":
      kind = "upstream";
      break;
    default:
      kind = kindForStatus(statusCode) ?? "upstream";
  }

  return exceptionForKind(kind, options.publicMessage, {
    message: message ?? `Stripe error${type ? ` (${type})` : ""}`,
    cause: error,
    context: { provider: "stripe", type, code, statusCode, ...options.context },
  });
}

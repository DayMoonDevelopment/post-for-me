/**
 * The shared error VOCABULARY — the small, stable set of kinds every failure is
 * classified into. Client-safe (no server/SDK imports), so both the server
 * `AppException` machinery (`~/lib/.server/errors`) and client code (the
 * {@link ActionError} `code`) speak the same language.
 *
 * A kind is the ONE identification axis: it drives the HTTP status, the default
 * user-facing copy, and any per-kind special handling. Provider-specific detail
 * (a Supabase `PGRST116`, a Stripe `StripeCardError`) is normalized INTO one of
 * these at the service boundary — call sites branch on the kind, never on a
 * third-party's error codes.
 */
export const ERROR_KINDS = [
  "unauthorized", // 401 — not signed in
  "forbidden", // 403 — signed in, but not allowed
  "not_found", // 404 — the resource doesn't exist / isn't visible
  "validation", // 422 — the input was rejected
  "conflict", // 409 — collides with existing state (unique violation, etc.)
  "rate_limited", // 429 — throttled
  "upstream", // 502 — a third-party (Supabase/Stripe/…) failed on us
  "internal", // 500 — an unexpected bug on our side
] as const;

export type ErrorKind = (typeof ERROR_KINDS)[number];

export function isErrorKind(value: unknown): value is ErrorKind {
  return (
    typeof value === "string" &&
    (ERROR_KINDS as readonly string[]).includes(value)
  );
}

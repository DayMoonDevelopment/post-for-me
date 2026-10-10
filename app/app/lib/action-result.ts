import type { ErrorKind } from "~/lib/errors";

/**
 * The shape a user-triggered action returns for an EXPECTED, recoverable
 * failure — one the caller surfaces as a toast, NOT by throwing to the
 * full-screen error boundary (reserve throwing for 404s / unrenderable pages /
 * truly unexpected state).
 *
 * Isomorphic on purpose: `actionError` is used in server actions, `isActionError`
 * in client components — so neither pulls a toast/UI dependency into the other's
 * bundle. `code` is the optional {@link ErrorKind} (set by `toActionError`) so a
 * client CAN branch on the kind; `error` alone stays enough for a plain toast.
 */
export type ActionError = { code?: ErrorKind; error: string; };

/** Return this from an action for a recoverable, user-facing failure. */
export function actionError(message: string, code?: ErrorKind): ActionError {
  return code ? { error: message, code } : { error: message };
}

/** Narrow a fetcher/action result to an {@link ActionError}. */
export function isActionError(value: unknown): value is ActionError {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error: unknown }).error === "string"
  );
}

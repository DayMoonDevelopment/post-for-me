import { redirectBackWithError } from "~/lib/.server/flash";
import { getPostHogServer } from "~/lib/.server/posthog";
import { actionError, type ActionError } from "~/lib/action-result";

import { AppException } from "./exceptions";

/**
 * The surface layer — how a caught error reaches a human. Each helper normalizes
 * (via {@link AppException.from}, so a provider error should be run through
 * `fromSupabase`/`fromStripe` first), LOGS it once with full context, then
 * converts it to the shape the caller's namespace uses:
 *
 * - `api.*` (fetcher data) → {@link toActionError} → toasted by `useActionErrorToast`.
 * - `redirect.*` / `callback.*` (navigations) → {@link redirectBackWithAppException} → flash toast.
 * - loaders / pages (boundary) → {@link toErrorResponse} → the root `ErrorBoundary`.
 *
 * Only the PUBLIC message ever crosses to the client; `message`/`cause`/`context`
 * stay in the server log.
 */

/**
 * Log an error once, structured, and return it normalized. The single choke point
 * for server-side error logging: `[error:<kind>] <internal message>` + merged
 * context + the `cause` (stack). Also best-effort captures to PostHog when a
 * `userId` is in context. Returns the {@link AppException} so the surface converters
 * can reuse it without re-normalizing.
 */
export function logError(
  error: unknown,
  context?: Record<string, unknown>,
): AppException {
  const appError = AppException.from(error);
  const merged = { ...appError.context, ...context };
  const hasContext = Object.keys(merged).length > 0;

  console.error(
    `[error:${appError.kind}] ${appError.message}`,
    hasContext ? merged : "",
    appError.cause ?? "",
  );

  captureException(appError, merged);
  return appError;
}

/** Best-effort PostHog exception capture. Only when a real `userId` is in context
 * (avoids ghost/merged persons — see `posthog.ts`), and NEVER throws: telemetry
 * must not break request handling. `captureException` guarded for older SDKs. */
function captureException(
  appError: AppException,
  context: Record<string, unknown>,
): void {
  const posthog = getPostHogServer();
  const userId = typeof context.userId === "string" ? context.userId : undefined;
  if (!posthog || !userId) return;
  try {
    const capture = (
      posthog as {
        captureException?: (
          error: unknown,
          distinctId?: string,
          properties?: Record<string, unknown>,
        ) => void;
      }
    ).captureException;
    capture?.call(posthog, appError.cause ?? appError, userId, {
      kind: appError.kind,
      ...context,
    });
  } catch {
    // swallow — analytics failures can't surface to the user
  }
}

/** For `api.*` catch blocks: log + return an {@link ActionError} carrying the
 * public message and the kind `code` (so the client can branch if it wants). */
export function toActionError(
  error: unknown,
  context?: Record<string, unknown>,
): ActionError {
  const appError = logError(error, context);
  return actionError(appError.publicMessage, appError.kind);
}

/** For loaders / pages: log + return a `Response` for the error boundary. Throw
 * the result (`throw toErrorResponse(error)`). */
export function toErrorResponse(
  error: unknown,
  context?: Record<string, unknown>,
): Response {
  return logError(error, context).toResponse();
}

/** For `redirect.*` / `callback.*` catch blocks: log + 302 back to the origin
 * with the public message flashed (toasted by the root flash handler). */
export function redirectBackWithAppException(
  request: Request,
  error: unknown,
  options?: {
    context?: Record<string, unknown>;
    fallback?: string;
    returnTo?: string | null;
  },
): Promise<Response> {
  const appError = logError(error, {
    returnTo: options?.returnTo ?? undefined,
    ...options?.context,
  });
  return redirectBackWithError(request, appError.publicMessage, {
    returnTo: options?.returnTo,
    fallback: options?.fallback,
  });
}

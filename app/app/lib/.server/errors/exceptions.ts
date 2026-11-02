import type { ErrorKind } from "~/lib/errors";

/** Each kind's HTTP status — the single mapping used by {@link AppException.toResponse}. */
const STATUS: Record<ErrorKind, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  validation: 422,
  conflict: 409,
  rate_limited: 429,
  upstream: 502,
  internal: 500,
};

/** Each kind's default USER-FACING copy. Deliberately generic + non-leaky — the
 * specific/internal detail lives in {@link AppException.message} + `cause`, which
 * never reach the client. Override per-throw when a safer, more specific line
 * helps the user. */
const PUBLIC_MESSAGE: Record<ErrorKind, string> = {
  unauthorized: "You need to sign in to continue.",
  forbidden: "You don't have access to this.",
  not_found: "We couldn't find what you're looking for.",
  validation: "Please check your input and try again.",
  conflict: "That conflicts with something that already exists.",
  rate_limited: "Too many requests — please slow down and try again.",
  upstream: "A service we rely on is having trouble. Please try again.",
  internal: "Something went wrong on our end. Please try again.",
};

/** Best-effort reverse map: an HTTP status → the kind it most likely represents.
 * Used to recover a kind from a thrown `Response` (guards, some `.server` ops).
 * Unknown/5xx default to `internal`. */
export function kindForStatus(status: number): ErrorKind {
  switch (status) {
    case 400:
    case 422:
      return "validation";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 429:
      return "rate_limited";
    case 502:
    case 503:
    case 504:
      return "upstream";
    default:
      return "internal";
  }
}

export interface AppExceptionOptions {
  /** The original error being wrapped, preserved via native `Error.cause` so a
   * stack + the third-party detail survive all the way to the log. */
  cause?: unknown;
  /** Structured context for logs (userId, ids, provider code…). NEVER serialized
   * to the client. */
  context?: Record<string, unknown>;
  /** DEVELOPER-facing detail for logs (defaults to the public message). NEVER
   * shown to a user — keep provider messages / ids / internals here. */
  message?: string;
  /** Override the status the kind maps to (rarely needed). */
  status?: number;
}

/**
 * The base error type — the shared SHAPE + behavior, NestJS-`HttpException`-style
 * but adapted for this app. It is thrown as one of the semantic subclasses below
 * (`ForbiddenException`, `NotFoundException`, …); this base only defines what they
 * all carry:
 *
 * - {@link kind} — the wire-safe identifier (also copied to `ActionError.code`).
 * - {@link status} — HTTP status.
 * - `message` (the `Error.message`) — INTERNAL/developer detail, for logs.
 * - {@link publicMessage} — the USER-SAFE string a toast / boundary shows.
 * - `cause` — the wrapped original error (native).
 * - {@link context} — structured log data.
 *
 * That split is how we keep original context (never lost — `message` + `cause` +
 * `context`) while never leaking it to the client.
 */
export class AppException extends Error {
  readonly kind: ErrorKind;
  readonly status: number;
  readonly publicMessage: string;
  readonly context?: Record<string, unknown>;

  constructor(
    kind: ErrorKind,
    publicMessage?: string,
    options: AppExceptionOptions = {},
  ) {
    const pub = publicMessage ?? PUBLIC_MESSAGE[kind];
    super(
      options.message ?? pub,
      options.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.name = new.target.name;
    this.kind = kind;
    this.publicMessage = pub;
    this.status = options.status ?? STATUS[kind];
    this.context = options.context;
  }

  /** A `Response` for the error boundary / a data route. Carries only the public
   * message (body + statusText) — never `message`/`cause`/`context`. */
  toResponse(): Response {
    return new Response(this.publicMessage, {
      status: this.status,
      statusText: this.publicMessage,
    });
  }

  static isAppException(value: unknown): value is AppException {
    return value instanceof AppException;
  }

  /**
   * Normalize ANY thrown value into an `AppException`. An existing one passes
   * through unchanged (so a subclass identity is preserved); a thrown `Response`
   * recovers its kind from the status; anything else becomes an
   * `InternalException` keeping the original as `message` + `cause`. Third-party
   * errors should be run through `fromSupabase`/`fromStripe` first — this is the
   * catch-all so a raw `throw` is never mishandled.
   */
  static from(error: unknown): AppException {
    if (error instanceof AppException) return error;
    if (error instanceof Response) {
      return exceptionForKind(
        kindForStatus(error.status),
        error.statusText || undefined,
        { message: `Response ${error.status}`, status: error.status, cause: error },
      );
    }
    if (error instanceof Error) {
      return new InternalException(undefined, {
        message: error.message,
        cause: error,
      });
    }
    return new InternalException(undefined, {
      message: typeof error === "string" ? error : "Unknown error",
      cause: error,
    });
  }
}

/* The semantic subclasses — Nest-idiom names. Each only pins its kind; all shape
 * + behavior is inherited. Throw + `instanceof`-check these. */

export class UnauthorizedException extends AppException {
  constructor(publicMessage?: string, options?: AppExceptionOptions) {
    super("unauthorized", publicMessage, options);
  }
}

export class ForbiddenException extends AppException {
  constructor(publicMessage?: string, options?: AppExceptionOptions) {
    super("forbidden", publicMessage, options);
  }
}

export class NotFoundException extends AppException {
  constructor(publicMessage?: string, options?: AppExceptionOptions) {
    super("not_found", publicMessage, options);
  }
}

export class ValidationException extends AppException {
  constructor(publicMessage?: string, options?: AppExceptionOptions) {
    super("validation", publicMessage, options);
  }
}

export class ConflictException extends AppException {
  constructor(publicMessage?: string, options?: AppExceptionOptions) {
    super("conflict", publicMessage, options);
  }
}

export class TooManyRequestsException extends AppException {
  constructor(publicMessage?: string, options?: AppExceptionOptions) {
    super("rate_limited", publicMessage, options);
  }
}

export class UpstreamException extends AppException {
  constructor(publicMessage?: string, options?: AppExceptionOptions) {
    super("upstream", publicMessage, options);
  }
}

export class InternalException extends AppException {
  constructor(publicMessage?: string, options?: AppExceptionOptions) {
    super("internal", publicMessage, options);
  }
}

/** Construct the subclass for a kind — the bridge the normalizers use so a
 * computed kind still yields a real `NotFoundException`/`ConflictException`/…
 * (so `instanceof` works downstream), not a bare base instance. */
export function exceptionForKind(
  kind: ErrorKind,
  publicMessage?: string,
  options?: AppExceptionOptions,
): AppException {
  switch (kind) {
    case "unauthorized":
      return new UnauthorizedException(publicMessage, options);
    case "forbidden":
      return new ForbiddenException(publicMessage, options);
    case "not_found":
      return new NotFoundException(publicMessage, options);
    case "validation":
      return new ValidationException(publicMessage, options);
    case "conflict":
      return new ConflictException(publicMessage, options);
    case "rate_limited":
      return new TooManyRequestsException(publicMessage, options);
    case "upstream":
      return new UpstreamException(publicMessage, options);
    case "internal":
      return new InternalException(publicMessage, options);
  }
}

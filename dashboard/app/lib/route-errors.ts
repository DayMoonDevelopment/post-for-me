import { isRouteErrorResponse } from "react-router";

export const routeErrors = {
  SESSION_EXPIRED: {
    status: 401,
    message: "Your session has expired. Please sign in again.",
  },
  AUTH_UNAVAILABLE: {
    status: 503,
    message: "We couldn’t verify your session. Please try again.",
  },
  PROJECT_NOT_FOUND: {
    status: 404,
    message:
      "This project could not be found or you no longer have access to it.",
  },
  PROJECT_LOAD_FAILED: {
    status: 503,
    message: "We couldn’t load this project. Please try again.",
  },
  ACCOUNTS_LOAD_FAILED: {
    status: 503,
    message: "We couldn’t load your social accounts. Please try again.",
  },
  CREDENTIALS_LOAD_FAILED: {
    status: 503,
    message: "We couldn’t load connection options. Please try again.",
  },
  UNEXPECTED_ERROR: {
    status: 500,
    message: "We couldn’t load this page. Please try again.",
  },
} as const;

export type RouteErrorCode = keyof typeof routeErrors;

export function getRouteError(error: unknown) {
  if (isRouteErrorResponse(error)) {
    const payload: unknown = error.data;
    if (
      payload &&
      typeof payload === "object" &&
      "code" in payload &&
      typeof payload.code === "string" &&
      Object.hasOwn(routeErrors, payload.code)
    ) {
      const code = payload.code as RouteErrorCode;
      const referenceId =
        "referenceId" in payload &&
        typeof payload.referenceId === "string" &&
        /^[a-f0-9-]{36}$/i.test(payload.referenceId)
          ? payload.referenceId
          : undefined;
      return { code, ...routeErrors[code], referenceId };
    }
    if (error.status === 404) {
      return {
        code: "PROJECT_NOT_FOUND" as const,
        status: 404,
        message: "The requested page could not be found.",
        referenceId: undefined,
      };
    }
  }
  return {
    code: "UNEXPECTED_ERROR" as const,
    ...routeErrors.UNEXPECTED_ERROR,
    referenceId: undefined,
  };
}

// Deliberately exclude raw messages, causes and database details: they can contain
// credentials or user data. Keep only diagnostic identifiers and stack locations.
export function safeErrorDetails(error: unknown) {
  const value = error && typeof error === "object" ? error : {};
  const identifier = (key: string) => {
    const field =
      key in value ? (value as Record<string, unknown>)[key] : undefined;
    return typeof field === "string" && /^[a-zA-Z0-9_.-]{1,80}$/.test(field)
      ? field
      : undefined;
  };
  return {
    exception_type: identifier("name"),
    error_code: identifier("code"),
    stack:
      error instanceof Error
        ? error.stack
            ?.split("\n")
            .filter((line) => /^\s*at /.test(line))
            .map((line) => line.replace(/\?[^\s)]*/g, "?[redacted]"))
            .slice(0, 15)
            .join("\n")
        : undefined,
  };
}

import { useTranslation } from "react-i18next";
import { isRouteErrorResponse } from "react-router";

export interface ErrorContent {
  description: string;
  stack?: string;
  title: string;
}

/**
 * Derive user-safe {@link ErrorState} copy from a route boundary error, shared by
 * every boundary so they read identically. A thrown `Response` surfaces its
 * `statusText` (the framework's public message); a raw `Error` keeps the generic
 * copy and stashes its message + stack in the dev-only collapsible — internal
 * detail never becomes the headline (and never ships to prod).
 */
export function useErrorContent(error: unknown): ErrorContent {
  const { t } = useTranslation();
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  const title = isNotFound ? t("error.notFoundTitle") : t("error.title");
  let description = isNotFound
    ? t("error.notFoundDetails")
    : t("error.genericDetails");
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    if (!isNotFound && error.statusText) description = error.statusText;
  } else if (import.meta.env.DEV && error instanceof Error) {
    stack = [error.message, error.stack].filter(Boolean).join("\n\n");
  }

  return { title, description, stack };
}

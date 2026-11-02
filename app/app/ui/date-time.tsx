"use client";

import { format } from "date-fns";
import { useMemo, useSyncExternalStore } from "react";

/**
 * The app's default user-facing timestamp format — e.g. *"Jun 25, 2026 at
 * 11:15am"*. `aaa` renders a lowercase `am`/`pm`. Used for post timestamps; pass
 * a different date-fns pattern to {@link LocaleDateTime} / {@link useLocaleDateTime}
 * for other shapes (e.g. a date-only `MMM d, yyyy`).
 */
export const DATE_TIME_FORMAT = "MMM d, yyyy 'at' h:mmaaa";
export const DATE_FORMAT = "MMM d, yyyy";

/**
 * `true` once the component has hydrated, `false` on the server and on the very
 * first client render. Backed by `useSyncExternalStore` so the first client
 * render is guaranteed to match the server (both `false`), then flips to `true`
 * — the canonical way to defer client-only output without a hydration mismatch.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * Re-express an instant so its *local* calendar fields equal its UTC fields. The
 * server's timezone and the client's differ, so formatting the real instant
 * produces different text on each — a hydration mismatch. `getUTC*` is
 * deterministic everywhere, so this gives both sides the same string to render
 * before hydration; once hydrated we format the real (local-timezone) instant.
 */
function asUTCFieldsDate(date: Date): Date {
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  );
}

/**
 * Format an ISO timestamp for display, **in the viewer's own timezone** — but
 * safely across SSR. Server + first client render emit a deterministic UTC-based
 * string (so they agree); after hydration it re-formats in the user's real
 * timezone. Pure string out; compose it yourself, or use {@link LocaleDateTime}
 * for the wrapped `<time>` element.
 */
export function useLocaleDateTime(
  value: string | Date,
  pattern: string = DATE_TIME_FORMAT,
): string {
  const hydrated = useHydrated();
  return useMemo(() => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return format(hydrated ? date : asUTCFieldsDate(date), pattern);
  }, [value, pattern, hydrated]);
}

/**
 * A user-facing timestamp rendered in the viewer's locale/timezone, wrapped in a
 * semantic `<time>` element (machine-readable `dateTime` carries the original ISO
 * instant). Hydration-safe via {@link useLocaleDateTime}. Reusable across the
 * posts grid, the post detail page, and anywhere else a timestamp is shown.
 */
export function LocaleDateTime({
  value,
  pattern = DATE_TIME_FORMAT,
  ...props
}: {
  pattern?: string;
  value: string;
} & Omit<React.ComponentProps<"time">, "dateTime" | "children">) {
  const text = useLocaleDateTime(value, pattern);
  return (
    <time dateTime={value} suppressHydrationWarning {...props}>
      {text}
    </time>
  );
}

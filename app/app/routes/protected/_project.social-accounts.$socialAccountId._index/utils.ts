/**
 * Date helpers for the account detail page.
 *
 * `locale` is REQUIRED rather than defaulted to `undefined`: an omitted
 * locale makes Intl use the operating system's, which drifts from the
 * language i18next is rendering — English copy beside `02.08.2026`. Callers
 * pass `i18n.language`. See the `i18n` skill, Rule 1.
 */
/** Locale-formatted medium date (e.g. the connected date). */
export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(iso),
  );
}

/** Locale-formatted date + time, or `null` when there's no instant. */
export function formatDateTime(
  iso: string | null,
  locale: string,
): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

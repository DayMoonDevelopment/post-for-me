/**
 * Humanize an identifier-style key for display: split camelCase, turn snake_case
 * / kebab-case separators into spaces, then Title-Case the words.
 *
 * `"share_to_feed"` → `"Share To Feed"`, `"replySettings"` → `"Reply Settings"`.
 *
 * Lives in its own tiny `lib` file rather than `lib/utils.ts` (which the shadcn
 * CLI rewrites).
 */
export function humanizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

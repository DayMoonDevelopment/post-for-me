/**
 * The canonical set of languages/tools a {@link ./code-panel CodePanel} can
 * render, in display order. Shared so any feature that shows "here's the code
 * for this action" (connect an account, create a post, …) draws from ONE list —
 * label, Prism grammar for highlighting, and the badge in {@link
 * ~/ui/language-mark LanguageMark} all key off the same `id`.
 */
export const CODE_LANGUAGES = [
  { id: "typescript", label: "TypeScript", grammar: "typescript" },
  { id: "python", label: "Python", grammar: "python" },
  { id: "ruby", label: "Ruby", grammar: "ruby" },
  { id: "go", label: "Go", grammar: "go" },
  // cURL is a shell command — highlighted as bash.
  { id: "curl", label: "cURL", grammar: "bash" },
] as const;

export type CodeLanguageId = (typeof CODE_LANGUAGES)[number]["id"];

/** Type guard for a persisted / serialized language id. */
export function isCodeLanguageId(value: string): value is CodeLanguageId {
  return CODE_LANGUAGES.some((entry) => entry.id === value);
}

/**
 * A feature's code samples: language id → source. Partial by design — a panel
 * renders a switcher over exactly the languages present, in {@link
 * CODE_LANGUAGES} order.
 */
export type CodeSamples = Partial<Record<CodeLanguageId, string>>;

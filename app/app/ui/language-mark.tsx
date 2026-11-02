import type * as React from "react";

import { cn } from "~/lib/utils";

/**
 * A small rounded badge for a programming language / tool, in that language's
 * own brand color with a short monogram — the code-language analogue of
 * {@link ~/ui/brand-mark BrandMark} (which uses each social platform's real
 * brand color). Sized to read cleanly in a menu row or a select trigger.
 *
 * Unknown languages render nothing (so a caller can pass any string safely).
 */
type LanguageMarkSpec = { bg: string; fg?: string; label: string };

const LANGUAGE_MARKS: Record<string, LanguageMarkSpec> = {
  typescript: { label: "TS", bg: "#3178C6" },
  python: { label: "Py", bg: "#3776AB" },
  ruby: { label: "Rb", bg: "#CC342D" },
  go: { label: "Go", bg: "#00ADD8" },
  // cURL is a shell command, not a branded SDK — a neutral terminal prompt.
  curl: { label: "$_", bg: "#3F3F46" },
};

export function LanguageMark({
  language,
  className,
  ...props
}: React.ComponentProps<"span"> & { language: string }) {
  const spec = LANGUAGE_MARKS[language];
  if (!spec) return null;
  return (
    <span
      aria-hidden
      data-slot="language-mark"
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-[0.25rem] font-sans text-[0.5625rem] font-semibold tracking-tight tabular-nums",
        className,
      )}
      style={{ backgroundColor: spec.bg, color: spec.fg ?? "#ffffff" }}
      {...props}
    >
      {spec.label}
    </span>
  );
}

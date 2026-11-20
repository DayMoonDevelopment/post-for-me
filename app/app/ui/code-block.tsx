import type * as React from "react";

import { Highlight, type PrismTheme, type Token } from "prism-react-renderer";

import { cn } from "~/lib/utils";
import { Copyable } from "~/ui/copyable";

// Register the grammars prism-react-renderer's bundle omits (Ruby, Bash). Bundled
// languages (TypeScript, Python, Go, JSON, …) need no import; an unknown `syntax`
// falls back to plain text.
import "./code-block-languages";

/**
 * CodeBlock — a read-only source-code sample: a monospace, horizontally
 * scrolling `<pre>` with a header (a language slot + whole-block copy via {@link
 * Copyable}). When a `syntax` grammar is given the code is syntax-highlighted via
 * prism-react-renderer, tokenized into React spans (never raw HTML) and colored
 * through the theme-aware `--syntax-*` tokens — the same token-color approach as
 * {@link ~/ui/json-block JsonBlock}. Without `syntax` it renders as plain text.
 *
 * `surface` (default `true`) draws the primitive's own bordered muted box, for
 * standalone use. Pass `surface={false}` to drop the box and sit transparently
 * inside an already-distinguished container (e.g. a modal's muted aside) so the
 * panel provides the surface and the block never nests a second one.
 */
export interface CodeBlockProps
  extends Omit<React.ComponentProps<"pre">, "children"> {
  /** The source to display, verbatim (whitespace preserved). */
  code: string;
  /** Accessible + tooltip label for the copy control. Default `"Copy code"`. */
  copyLabel?: string;
  /** Extra classes for the header row — e.g. trailing padding so the copy
   * control clears an overlapping affordance (a dialog's close button). */
  headerClassName?: string;
  /** The header's start slot. A string renders as a muted uppercase language
   * tag (e.g. `"TypeScript"`); any other node renders as-is, so it can be an
   * interactive control such as a language switcher. */
  language?: React.ReactNode;
  /** Show a left line-number gutter (editor-style). Default `false`. */
  showLineNumbers?: boolean;
  /** Draw the primitive's own muted box. Default `true`; `false` to embed. */
  surface?: boolean;
  /** Prism grammar to highlight with (`"typescript"`, `"python"`, `"ruby"`,
   * `"go"`, `"bash"`, …). Omit for plain, unhighlighted text. */
  syntax?: string;
}

/** Neutral theme: prism-react-renderer requires a theme, but color comes from our
 * `--syntax-*` token classes, so this contributes no inline styles. */
const PLAIN_THEME: PrismTheme = { plain: {}, styles: [] };

/** Prism token type → `--syntax-*` utility. Unlisted types inherit `--foreground`
 * (plain identifiers, variables, whitespace). First matching type wins. */
const TOKEN_CLASS: Record<string, string> = {
  "attr-name": "text-syntax-function",
  "attr-value": "text-syntax-string",
  boolean: "text-syntax-number",
  builtin: "text-syntax-class",
  cdata: "text-syntax-comment italic",
  char: "text-syntax-string",
  "class-name": "text-syntax-class",
  comment: "text-syntax-comment italic",
  constant: "text-syntax-number",
  doctype: "text-syntax-comment italic",
  function: "text-syntax-function",
  keyword: "text-syntax-keyword",
  number: "text-syntax-number",
  operator: "text-syntax-punctuation",
  prolog: "text-syntax-comment italic",
  property: "text-syntax-function",
  punctuation: "text-syntax-punctuation",
  regex: "text-syntax-string",
  string: "text-syntax-string",
  symbol: "text-syntax-number",
  tag: "text-syntax-keyword",
  url: "text-syntax-string",
};

function tokenClassName(types: readonly string[]): string | undefined {
  for (const type of types) {
    const className = TOKEN_CLASS[type];
    if (className) return className;
  }
  return undefined;
}

/** One code line: an optional non-selectable line number, then the tokens. Each
 * row is at least one line tall so blank lines keep their height. */
function CodeRows({
  lines,
  showLineNumbers,
}: {
  lines: Token[][];
  showLineNumbers?: boolean;
}) {
  return (
    <code className="block font-mono text-foreground">
      {lines.map((line, lineIndex) => (
        <span key={lineIndex} className="flex min-h-[1lh]">
          {showLineNumbers ? (
            <span className="me-4 w-[2ch] shrink-0 select-none text-end text-muted-foreground/50 tabular-nums">
              {lineIndex + 1}
            </span>
          ) : null}
          <span className="whitespace-pre">
            {line.map((token, tokenIndex) => (
              <span key={tokenIndex} className={tokenClassName(token.types)}>
                {token.content}
              </span>
            ))}
          </span>
        </span>
      ))}
    </code>
  );
}

function CodeBody({
  code,
  syntax,
  showLineNumbers,
}: {
  code: string;
  showLineNumbers?: boolean;
  syntax?: string;
}) {
  if (!syntax) {
    const lines: Token[][] = code
      .split("\n")
      .map((text) => [{ types: [], content: text } as Token]);
    return <CodeRows lines={lines} showLineNumbers={showLineNumbers} />;
  }
  return (
    <Highlight code={code} language={syntax} theme={PLAIN_THEME}>
      {({ tokens }) => (
        <CodeRows lines={tokens} showLineNumbers={showLineNumbers} />
      )}
    </Highlight>
  );
}

export function CodeBlock({
  code,
  language,
  syntax,
  showLineNumbers,
  copyLabel = "Copy code",
  surface = true,
  className,
  headerClassName,
  ...props
}: CodeBlockProps) {
  return (
    <div
      data-slot="code-block"
      className={cn(
        "flex min-h-0 flex-col overflow-hidden text-xs",
        surface && "rounded-lg border border-border bg-muted/40",
        className,
      )}
    >
      {/* Header: language slot (start) + copy (end). Kept even without a language
          so the copy affordance always has a home and the body owns the scroll
          below it. */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-4 py-2",
          headerClassName,
        )}
      >
        {language == null ? (
          <span aria-hidden />
        ) : typeof language === "string" ? (
          <span className="font-mono text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
            {language}
          </span>
        ) : (
          // A non-string language is an interactive slot (e.g. a language
          // switcher) — render it as-is, no label typography imposed.
          language
        )}
        <Copyable
          value={code}
          label={copyLabel}
          icon="start"
          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {/* 13px / leading-normal reads as editor code, not prose (text-xs was
            small and leading-relaxed left the lines too airy). */}
        <pre className="px-4 py-3 text-[0.8125rem] leading-normal" {...props}>
          <CodeBody
            code={code}
            syntax={syntax}
            showLineNumbers={showLineNumbers}
          />
        </pre>
      </div>
    </div>
  );
}

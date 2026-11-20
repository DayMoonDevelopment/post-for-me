import * as React from "react";

import { cn } from "~/lib/utils";

import { highlight } from "./highlight";

/**
 * Renders `code` with Shiki syntax highlighting once mounted. Until then — and
 * on the server — it renders a plain `<pre>` (identical markup on SSR + first
 * client render, so no hydration mismatch), then swaps in the highlighted HTML.
 */
export function HighlightedCode({
  code,
  lang = "tsx",
  className,
}: {
  code: string;
  lang?: string;
  className?: string;
}) {
  const [html, setHtml] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    highlight(code, lang)
      .then((result) => {
        if (active) setHtml(result);
      })
      .catch(() => {
        /* leave the plain <pre> fallback in place */
      });
    return () => {
      active = false;
    };
  }, [code, lang]);

  if (html) {
    return (
      <div
        className={cn(
          "text-xs leading-relaxed [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:p-0",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <pre className={cn("text-xs leading-relaxed", className)}>
      <code className="font-mono text-foreground">{code}</code>
    </pre>
  );
}

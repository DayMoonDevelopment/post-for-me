import { cn } from "~/lib/utils";

import { Copyable } from "./copyable";
import { HighlightedCode } from "./highlighted-code";

// A code/config block: Shiki-highlighted (falls back to plain text pre-mount),
// copyable. `lang` defaults to tsx; pass "json"/"bash"/"text" as needed.
export function CodeBlock({
  children,
  lang,
  onCopy,
  className,
}: {
  children: string;
  lang?: string;
  onCopy?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl relative overflow-hidden border bg-muted/40",
        className,
      )}
    >
      <HighlightedCode
        code={children}
        lang={lang}
        className="max-h-[32rem] overflow-auto p-4 pr-12"
      />
      <Copyable
        value={children}
        onCopy={onCopy}
        className="absolute end-2 top-2"
      />
    </div>
  );
}

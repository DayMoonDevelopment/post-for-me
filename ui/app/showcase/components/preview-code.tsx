import * as React from "react";

import { CodeBlock } from "./code-block";

/** A Preview / Code toggle — the rendered component, or its source (copyable). */
export function PreviewCode({
  preview,
  code,
  minHeight = "min-h-64",
}: {
  preview: React.ReactNode;
  code?: string;
  minHeight?: string;
}) {
  const [tab, setTab] = React.useState<"preview" | "code">("preview");

  const frame = (
    <div
      className={`rounded-xl flex ${minHeight} items-center justify-center border bg-background p-8`}
    >
      {preview}
    </div>
  );

  if (!code) return frame;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {(["preview", "code"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTab(option)}
            data-active={option === tab}
            className="rounded px-2.5 py-1 text-xs font-medium text-muted-foreground capitalize transition-colors hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-foreground"
          >
            {option}
          </button>
        ))}
      </div>
      {tab === "preview" ? frame : <CodeBlock>{code}</CodeBlock>}
    </div>
  );
}

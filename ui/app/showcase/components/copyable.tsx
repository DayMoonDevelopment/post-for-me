import * as React from "react";

import { Check, Copy } from "lucide-react";

import { cn } from "~/lib/utils";

/** A copy-to-clipboard button with a copied-confirmation swap. */
export function Copyable({
  value,
  onCopy,
  className,
}: {
  value: string;
  onCopy?: () => void;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  function copy() {
    void navigator.clipboard?.writeText(value);
    onCopy?.();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      {copied ? (
        <Check className="size-3.5 text-success" />
      ) : (
        <Copy className="size-3.5" />
      )}
      <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

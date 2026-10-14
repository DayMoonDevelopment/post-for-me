import { cn } from "~/lib/utils";
import { Copyable } from "~/ui/copyable";

/**
 * A copyable identifier — a monospace value with a copy affordance, or an
 * em-dash when absent. `className` lands on the value text: pass `break-all` in a
 * narrow column, or leave the default no-wrap for a horizontally-scrolling table
 * cell. Shared across the post + result detail surfaces.
 */
export function CopyableId({
  value,
  copyLabel,
  className,
}: {
  className?: string;
  copyLabel: string;
  value: string | null;
}) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <Copyable value={value} label={copyLabel}>
      <span
        className={cn("font-mono text-xs text-left rtl:text-right", className)}
      >
        {value}
      </span>
    </Copyable>
  );
}

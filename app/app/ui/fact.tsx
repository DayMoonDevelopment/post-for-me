import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

/**
 * A labelled fact — a small uppercase label above its value. The compact,
 * read-only label→value block for detail/summary surfaces (ids, dates, status,
 * counts…). Lay several out in a flex/grid for a "facts strip" (e.g. the social
 * account detail page). The value is freeform: plain text, a {@link Badge}, a
 * {@link Copyable}, etc.
 *
 * `orientation="horizontal"` puts the label and value on one line, label leading
 * and value trailing — the shape for a single quick-reference reading (a status
 * badge above a section, say) where a stacked block would waste a whole row on
 * one word. Several of those in a column read as a settings-style summary list.
 */
export function Fact({
  label,
  orientation = "vertical",
  className,
  children,
}: {
  children: ReactNode;
  className?: string;
  label: ReactNode;
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <div
      data-slot="fact"
      data-orientation={orientation}
      className={cn(
        "flex min-w-0",
        orientation === "horizontal"
          ? "items-center justify-between gap-4"
          : "flex-col gap-1",
        className,
      )}
    >
      <span className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <div className="min-w-0 text-sm text-foreground">{children}</div>
    </div>
  );
}

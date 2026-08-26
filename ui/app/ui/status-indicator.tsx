import type { ComponentProps } from "react";
import { cva } from "class-variance-authority";

import { cn } from "~/lib/utils";

/**
 * A small round **status indicator** in a first-party semantic color. The single
 * primitive for "a colored status dot" — used inline, as an avatar accessory, in
 * lists, etc. Color comes from {@link StatusName}; pass a `bg-*` className for a
 * one-off hue. Size + any ring/position come from `className`.
 *
 * The semantic colors (`success`/`warning`/`info`) are registry-owned tokens
 * shipped by the `@post-for-me/tokens` item — installing this pulls them in.
 */

/** A semantic status state — the color of a {@link StatusIndicator} / health dot. */
export type StatusName =
  | "default"
  | "success"
  | "warning"
  | "destructive"
  | "info";

/**
 * Class variants for the status dot. Exported so a consumer can paint their own
 * element (a table cell, a legend swatch) in the same semantic colors without
 * rebuilding the mapping.
 */
export const statusIndicatorVariants = cva(
  "inline-block size-2 shrink-0 rounded-full",
  {
    variants: {
      status: {
        default: "bg-muted-foreground",
        success: "bg-success",
        warning: "bg-warning",
        destructive: "bg-destructive",
        info: "bg-info",
      } satisfies Record<StatusName, string>,
    },
    defaultVariants: {
      status: "default",
    },
  },
);

export function StatusIndicator({
  status = "default",
  className,
  ...props
}: {
  status?: StatusName;
} & ComponentProps<"span">) {
  return (
    <span
      data-slot="status-indicator"
      className={cn(statusIndicatorVariants({ status }), className)}
      {...props}
    />
  );
}

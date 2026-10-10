import * as React from "react";

import { cn } from "~/lib/utils";

/**
 * A paper-receipt display for line items and totals.
 *
 * A compound family in the same shape as {@link ~/ui/card Card}: every part
 * takes `children` and nothing else, so the consumer assembles the receipt
 * rather than handing it data. No `label`/`amount`/`lines` props — a line's
 * label can be a badge, its amount can be a `Copyable`, and a note can sit
 * under either, without this file knowing.
 *
 * The paper is hand-rolled rather than reusing Card so it can carry its own
 * texture and silhouette: a fine dot grid at very low contrast, and a torn
 * bottom edge where the slip was pulled from the printer. Quiet otherwise — no
 * leaders by default, no heavy chrome; it reads as a printed slip from the
 * monospace column, the letter-spacing, and the generous line spacing.
 * Amounts use `tabular-nums` so they align in a true column.
 *
 * ```tsx
 * <Receipt>
 *   <ReceiptHeader>
 *     <ReceiptTitle>Post for Me</ReceiptTitle>
 *     <ReceiptMeta>Jul 29, 2026</ReceiptMeta>
 *   </ReceiptHeader>
 *   <ReceiptDivider />
 *   <ReceiptItems>
 *     <ReceiptItem>
 *       <ReceiptItemLabel>Social Post API Usage</ReceiptItemLabel>
 *       <ReceiptItemAmount>34.00</ReceiptItemAmount>
 *       <ReceiptItemNote>340 posts at 0.10</ReceiptItemNote>
 *     </ReceiptItem>
 *   </ReceiptItems>
 *   <ReceiptDivider />
 *   <ReceiptTotal>
 *     <ReceiptTotalLabel>Total</ReceiptTotalLabel>
 *     <ReceiptTotalAmount>34.00</ReceiptTotalAmount>
 *   </ReceiptTotal>
 * </Receipt>
 * ```
 */
function Receipt({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="receipt"
      className={cn(
        "relative isolate flex w-full max-w-xs flex-col gap-5 rounded-t-sm bg-muted/50 px-8 pt-7 pb-9 font-mono text-xs text-foreground",
        // Paper grain: a 1px dot on an 8px grid, barely there. Uses the theme's
        // foreground so it inverts with dark mode instead of muddying it.
        "[background-image:radial-gradient(color-mix(in_oklch,var(--color-foreground)_12%,transparent)_0.5px,transparent_0.5px)] [background-size:8px_8px]",
        // The border lives on a ::before overlay, not the box, so it can FADE
        // toward the tear: a vertical mask dissolves it before it reaches the
        // teeth, the way a torn edge loses its printed line. (`border-image`
        // would also gradient a border, but it silently disables radius.)
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-t-[inherit] before:border before:border-b-0 before:border-border",
        "before:[mask-image:linear-gradient(to_bottom,#000_55%,transparent_95%)]",
        // The tear, bottom only. Two mask layers unioned: a solid block for
        // everything above the last 6px, and a conic gradient tiled every 12px
        // that cuts the zig-zag teeth. The extra `pb` keeps content off them.
        "[mask-image:linear-gradient(#000,#000),conic-gradient(from_-45deg_at_bottom,#0000,#000_1deg_89deg,#0000_90deg)]",
        "[mask-size:100%_calc(100%_-_6px),12px_6px] [mask-position:top,bottom] [mask-repeat:no-repeat,repeat-x]",
        "[&>*]:relative",
        className,
      )}
      {...props}
    />
  );
}

function ReceiptHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="receipt-header"
      className={cn("flex flex-col items-center gap-1.5 text-center", className)}
      {...props}
    />
  );
}

function ReceiptTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="receipt-title"
      className={cn(
        "text-xs font-bold tracking-[0.22em] text-foreground uppercase",
        className,
      )}
      {...props}
    />
  );
}

function ReceiptMeta({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="receipt-meta"
      className={cn(
        "text-[0.6875rem] tracking-[0.15em] text-muted-foreground uppercase",
        className,
      )}
      {...props}
    />
  );
}

/** A dashed rule, the way a receipt separates sections. Not `Separator` — that's
 * a solid hairline read as UI chrome; the dashes are the paper idiom. */
function ReceiptDivider({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="receipt-divider"
      role="presentation"
      className={cn("border-t border-dashed border-foreground/15", className)}
      {...props}
    />
  );
}

/** The line-item column — a `<dl>`, so label→amount pairs are read as pairs. */
function ReceiptItems({ className, ...props }: React.ComponentProps<"dl">) {
  return (
    <dl
      data-slot="receipt-items"
      className={cn("flex flex-col gap-5", className)}
      {...props}
    />
  );
}

/** One line. Wraps, so a note can take a full row beneath the label/amount. */
function ReceiptItem({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="receipt-item"
      className={cn("flex flex-wrap items-baseline gap-x-4 gap-y-1", className)}
      {...props}
    />
  );
}

function ReceiptItemLabel({ className, ...props }: React.ComponentProps<"dt">) {
  return (
    <dt
      data-slot="receipt-item-label"
      className={cn(
        "min-w-0 flex-1 tracking-[0.08em] text-foreground uppercase",
        className,
      )}
      {...props}
    />
  );
}

function ReceiptItemAmount({ className, ...props }: React.ComponentProps<"dd">) {
  return (
    <dd
      data-slot="receipt-item-amount"
      className={cn("shrink-0 tabular-nums text-foreground", className)}
      {...props}
    />
  );
}

/** A sub-line under a label — a quantity, a rate, a period. Takes a full row. */
function ReceiptItemNote({ className, ...props }: React.ComponentProps<"dd">) {
  return (
    <dd
      data-slot="receipt-item-note"
      className={cn(
        "basis-full tracking-[0.08em] text-[0.6875rem] text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

/**
 * An optional dotted run between a label and its amount. Off by default — the
 * column alignment already does this job, and leaders make a short receipt look
 * busy. Reach for it only when labels are long enough that the eye loses the row.
 */
function ReceiptLeader({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="receipt-leader"
      aria-hidden
      className={cn(
        "min-w-3 flex-1 translate-y-[-0.2em] border-b border-dotted border-foreground/20",
        className,
      )}
      {...props}
    />
  );
}

/** The total row — heavier than a line item, since a receipt's job is leading
 * the eye here. Draws no rule of its own: place a `ReceiptDivider` above it, so
 * subtotal/tax rows can share the same group. */
function ReceiptTotal({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="receipt-total"
      className={cn(
        "flex items-baseline justify-between gap-4 text-sm font-bold",
        className,
      )}
      {...props}
    />
  );
}

function ReceiptTotalLabel({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="receipt-total-label"
      className={cn("tracking-[0.12em] text-foreground uppercase", className)}
      {...props}
    />
  );
}

function ReceiptTotalAmount({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="receipt-total-amount"
      className={cn("tabular-nums text-foreground", className)}
      {...props}
    />
  );
}

function ReceiptFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="receipt-footer"
      className={cn(
        "flex flex-col items-center gap-2 text-center text-[0.625rem] tracking-[0.18em] text-muted-foreground uppercase",
        className,
      )}
      {...props}
    />
  );
}

/** Decorative barcode, drawn with a repeating gradient rather than an image so
 * it costs nothing and inherits the text colour. Ornamental only — hidden from
 * assistive tech, never a substitute for showing an id as text. */
function ReceiptBarcode({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="receipt-barcode"
      aria-hidden
      className={cn(
        "h-8 w-full bg-foreground/80",
        "[mask-image:repeating-linear-gradient(90deg,#000_0_1px,#0000_1px_3px,#000_3px_5px,#0000_5px_6px,#000_6px_9px,#0000_9px_11px)]",
        className,
      )}
      {...props}
    />
  );
}

export {
  Receipt,
  ReceiptBarcode,
  ReceiptDivider,
  ReceiptFooter,
  ReceiptHeader,
  ReceiptItem,
  ReceiptItemAmount,
  ReceiptItemLabel,
  ReceiptItemNote,
  ReceiptItems,
  ReceiptLeader,
  ReceiptMeta,
  ReceiptTitle,
  ReceiptTotal,
  ReceiptTotalAmount,
  ReceiptTotalLabel,
};

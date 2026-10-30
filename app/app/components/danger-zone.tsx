import type * as React from "react";

import { cn } from "~/lib/utils";
import { Card } from "~/ui/card";

/**
 * A destructive-framed panel — the "Danger zone" that closes a settings/detail
 * page. It's a {@link Card} with the destructive ring baked in, plus the
 * stacked-on-mobile / row-at-`sm` header+actions arrangement every danger zone
 * used to hand-roll (and had quietly drifted apart on: `gap-1` vs `gap-0.5`,
 * `text-sm` vs `text-xs/relaxed`). Those are settled here, so no call site
 * passes any layout, radius, border, spacing, or destructive-colour class.
 *
 * Compound, because the three call sites differ in how their actions are wired
 * (a plain button, a `ConfirmDialog` trigger, an n-button row):
 *
 * ```tsx
 * <DangerZone>
 *   <DangerZoneHeader>
 *     <DangerZoneTitle>{t("…dangerTitle")}</DangerZoneTitle>
 *     <DangerZoneDescription>{t("…dangerDescription")}</DangerZoneDescription>
 *   </DangerZoneHeader>
 *   <DangerZoneActions>
 *     <Button variant="destructive">…</Button>
 *   </DangerZoneActions>
 *   {/* non-visual children (ConfirmDialog, fetcher wiring) sit here *\/}
 * </DangerZone>
 * ```
 *
 * The header and actions are the only two boxes in the row — non-visual children
 * (a controlled `ConfirmDialog`) render nothing in flow, so `justify-between`
 * keeps the title left / actions right regardless.
 */
function DangerZone({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Card>) {
  return (
    <Card className={cn("ring-destructive/20", className)} {...props}>
      <div className="flex flex-col gap-4 px-(--card-spacing) sm:flex-row sm:items-center sm:justify-between">
        {children}
      </div>
    </Card>
  );
}

/** Title + description, stacked and left-aligned. */
function DangerZoneHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex min-w-0 flex-col gap-0.5", className)}
      {...props}
    />
  );
}

/** The destructive-toned heading — call sites never pass `text-destructive`. */
function DangerZoneTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "font-heading text-sm font-semibold text-destructive",
        className,
      )}
      {...props}
    />
  );
}

/** The supporting copy under the title. */
function DangerZoneDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

/** Wraps and right-aligns, so one control or several both land correctly. */
function DangerZoneActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-wrap justify-end gap-2", className)}
      {...props}
    />
  );
}

export {
  DangerZone,
  DangerZoneActions,
  DangerZoneDescription,
  DangerZoneHeader,
  DangerZoneTitle,
};

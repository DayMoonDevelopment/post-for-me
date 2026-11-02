import type { ReactNode } from "react";

import { Link } from "react-router";

import { cn } from "~/lib/utils";
import { Copyable } from "~/ui/copyable";

/**
 * Cell presentations shared across the list data grids.
 *
 * These deliberately live OUTSIDE `~/components/data-grid`, which is vendored
 * from @reui and gets overwritten on re-sync — see the ReUI re-vendor recipe.
 * Anything of ours that a grid needs belongs here instead.
 */

/**
 * The navigating cell in a clickable row — the row's REAL affordance.
 *
 * Our tables put `onClick` on the `<tr>`, which is mouse-only: a `<tr>` isn't
 * focusable, takes no keyboard events, and ignores Cmd/middle-click. So every
 * clickable row carries one of these in its primary cell, and the row handler
 * degrades to a convenience for pointer users.
 *
 * `stopPropagation` is load-bearing: without it a click here would ALSO run the
 * row's handler, navigating twice and pushing two history entries — so "back"
 * would appear broken.
 */
export function RowLink({
  children,
  className,
  to,
}: {
  children: ReactNode;
  className?: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "block min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/**
 * A truncated, click-to-copy identifier cell (Post for Me id, platform id,
 * external id).
 *
 * `Copyable` stops click propagation internally, so copying an id never also
 * fires the row's navigation.
 */
export function IdCell({ label, value }: { label: string; value: string }) {
  return (
    <Copyable value={value} label={label} className="max-w-full">
      <span className="truncate font-mono">{value}</span>
    </Copyable>
  );
}

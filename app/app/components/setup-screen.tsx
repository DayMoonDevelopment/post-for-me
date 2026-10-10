import type * as React from "react";

import { cn } from "~/lib/utils";
import { Empty, EmptyDescription, EmptyHeader } from "~/ui/empty";

/**
 * Display-neutral layout primitives for a single "setup action" screen — the
 * content of one step toward a functional project (connect an account, create
 * an API key, …). A screen is intentionally chrome-agnostic: it renders a
 * header + body and nothing about HOW it's framed. The SAME screen is consumed
 * by two different frames:
 *
 *  - a standalone {@link Dialog} (the single-step modal a checklist row opens,
 *    or a contextual trigger elsewhere in the app), and
 *  - a slide in the launchpad guided-tour carousel.
 *
 * Because the screen owns no width/height/scroll, each frame supplies its own
 * (the dialog box, or the fixed-height carousel slide). Keep these parts free of
 * any dependency on `dialog`/`carousel`/`launchpad` so an action family can be
 * imported anywhere without dragging a frame along — that modularity is the
 * whole point (an action's content is reusable across display types).
 *
 * Mirrors the spirit of the onboarding slide primitives
 * (`OnboardingSlideHeader` / `OnboardingSlideScroll`) but stands alone so it can
 * live in the global, data-connected `app/components` layer.
 */
export function SetupScreen({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="setup-screen"
      className={cn("flex min-h-0 flex-1 flex-col", className)}
      {...props}
    />
  );
}

/** The pinned, non-scrolling top of a screen: an optional icon, a title, and a
 * description. */
export function SetupScreenHeader({
  icon,
  title,
  description,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  description?: React.ReactNode;
  icon?: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <div
      data-slot="setup-screen-header"
      className={cn("flex shrink-0 flex-col gap-1.5", className)}
      {...props}
    >
      {icon ? (
        // Non-interactive accent badge — "pop", not "primary" (primary reads as an
        // interactive/brand action). Mirrors the Empty component's icon badge.
        <span className="mb-1 flex size-10 items-center justify-center rounded-lg bg-pop/10 text-pop [&_svg]:size-5">
          {icon}
        </span>
      ) : null}
      <h2 className="font-heading text-xl font-semibold text-foreground">
        {title}
      </h2>
      {description ? (
        <p className="text-sm/relaxed text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </div>
  );
}

/** The screen's main region. Scrolls its own overflow so a long step body never
 * grows the frame; the frame caps the height. */
export function SetupScreenBody({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="setup-screen-body"
      // Full-bleed scroll region: the negative inline margin cancels the frame's
      // px-6 so the scrollbar rides the modal edge instead of cutting across the
      // content (mirrors OnboardingSlideScroll). The inner wrapper re-applies the
      // horizontal padding, the top gap, and a bottom gutter so the last item is
      // never flush against the footer.
      className="-mx-6 min-h-0 flex-1 overflow-y-auto"
      {...props}
    >
      <div className={cn("flex flex-col gap-4 px-6 pt-4 pb-4", className)}>
        {children}
      </div>
    </div>
  );
}

/**
 * A dashed placeholder block standing in for a step's real UI. Every action
 * screen ships with one of these for now — the modular STRUCTURE (content +
 * dialog + tour + checklist) is what's being built; the per-step "designer"
 * UI gets filled in later, in place, without touching the surrounding wiring.
 */
export function SetupScreenPlaceholder({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <Empty
      data-slot="setup-screen-placeholder"
      // Empty ships `border-dashed` but no border width — add `border` to draw
      // the placeholder outline.
      className={cn("min-h-32 rounded-lg border", className)}
      {...props}
    >
      <EmptyHeader>
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

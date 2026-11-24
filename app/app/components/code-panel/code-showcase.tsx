import type * as React from "react";

import { cn } from "~/lib/utils";

/**
 * CodeShowcase — the "UI + code" split: a primary action-UI region beside a
 * {@link ./code-panel CodePanel}. Frame-agnostic on purpose, so the SAME split
 * works standalone inside a framed `ModalContent` (connect an account) AND as a
 * slide in a carousel / onboarding flow.
 *
 *   <CodeShowcase>
 *     <CodeShowcaseMain>{…action UI…}</CodeShowcaseMain>
 *     <CodeShowcaseAside>
 *       <CodePanel samples={…} />
 *     </CodeShowcaseAside>
 *   </CodeShowcase>
 *
 * Container-query responsive: side-by-side (2/5 UI · 3/5 code) once the showcase
 * is wide, stacked (UI over code) when narrow — so a wide modal splits while a
 * narrow onboarding slide stacks, from one component. The whole chain is
 * `flex-1 min-h-0` so each region scrolls INTERNALLY within a bounded parent
 * (a framed modal, a fixed-height slide) rather than growing it.
 *
 * When on-screen UI instead wants to *pull up* its code (no side-by-side), skip
 * this and drop a bare {@link ./code-panel CodePanel} into a sheet/dialog.
 */
export function CodeShowcase({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-showcase"
      className={cn("@container flex min-h-0 flex-1 flex-col", className)}
      {...props}
    >
      <div className="flex min-h-0 flex-1 flex-col @2xl:flex-row">
        {children}
      </div>
    </div>
  );
}

/** The primary column: the action's own UI. Scrolls its overflow; owns the
 * standard content padding (override via `className`). Grows 2 to the aside's 3. */
export function CodeShowcaseMain({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-showcase-main"
      className={cn(
        "min-h-0 flex-[2_1_0%] overflow-y-auto px-6 py-4",
        className,
      )}
      {...props}
    />
  );
}

/** The distinguished code column: a muted panel that hosts a {@link
 * ./code-panel CodePanel} (which owns its own padding/scroll, so this is `p-0`).
 * A side border once side-by-side, a top border when stacked. Grows 3 to 2. */
export function CodeShowcaseAside({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-showcase-aside"
      className={cn(
        "flex min-h-0 flex-[3_1_0%] flex-col overflow-hidden border-t border-border bg-muted/50",
        "@2xl:border-s @2xl:border-t-0",
        className,
      )}
      {...props}
    />
  );
}

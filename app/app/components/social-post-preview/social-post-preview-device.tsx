import type { ComponentProps, ReactNode } from "react";

import { cn } from "~/lib/utils";

/**
 * The device frame a preview renders inside — a phone. Two jobs:
 *
 * 1. **Clips the chrome to one rounded shape.** The screen owns the corner radius +
 *    `overflow-hidden`; content fills it and is clipped. The bezel is a SEPARATE outer body
 *    (padding + `bg-foreground`), NOT a `border` on the clipping element — a border + radius +
 *    overflow doesn't nest cleanly, so the bezel/screen boundary leaked the screen's `bg` as a
 *    white crescent at the corners (visible against a chrome's dark edge, e.g. YouTube's black
 *    bar). Bezel radius (`13cqi`) and screen radius (`10.5cqi`) are **concentric** (outer −
 *    padding), so they nest exactly.
 * 2. **Owns the scale.** The OUTER element is the container-query context (`container-type:
 *    inline-size`); everything below sizes off it. The screen sets a container-relative base
 *    font (`text-[4cqi]`) so every chrome sizes its text / padding / spacing in `em` and scales
 *    with the frame at any width — never a fixed px. Radii + padding are `cqi` too, so they stay
 *    the same *fraction* of the frame at every size. All `cqi` values live on children of the
 *    container, never the container itself: `cqi` resolves against the nearest *ancestor*
 *    container, so on the container element it would fall back to the viewport.
 *
 * The frame is the **lowest-fidelity phone mock**: a chunky `bg-foreground` bezel and heavily
 * rounded corners. **No shadow** on purpose — `className` is forwarded to the bezel, so a
 * consumer adds their own elevation (`shadow-*`) and it follows the rounded shape. The screen
 * (inner content) radius ≈10.5cqi (≈2.6em) — the clearance the full-bleed chromes' corner
 * overlays are tuned against. No dynamic island. One style for now; this is the seam where
 * browser / bare / other device styles drop in later (a `variant`, then per-style files).
 */
export function SocialPostPreviewDevice({
  className,
  children,
  ...props
}: {
  children?: ReactNode;
} & ComponentProps<"div">) {
  return (
    <div className="relative mx-auto w-full max-w-64 select-none [container-type:inline-size]">
      <div
        data-slot="social-post-preview-device"
        className={cn(
          "rounded-[13cqi] bg-foreground p-[2.5cqi]",
          className,
        )}
        {...props}
      >
        {/* The SCREEN owns the aspect (`9/19.5`) — the bezel wraps it with `cqi` padding, so
            the content area (and thus a full-bleed chrome) is exactly this ratio and fills it
            with no gap. Putting the aspect on the outer instead left the padded screen a
            slightly different ratio, and vertical chromes didn't fill. */}
        <div
          data-slot="social-post-preview-screen"
          className="aspect-[9/19.5] overflow-hidden rounded-[10.5cqi] bg-background text-[4cqi]"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

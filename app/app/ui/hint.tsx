import type * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { HintIcon as HintGlyph } from "~/icons";
import { cn } from "~/lib/utils";

/**
 * Hint — a lightbulb affordance in the dedicated `hint` (amber) colorspace, for
 * surfacing a tip / idea. A composable family: assemble {@link HintIcon} and
 * {@link HintText} inside {@link Hint}.
 *
 *   <Hint size="sm">
 *     <HintIcon />
 *     <HintText>Tip</HintText>
 *   </Hint>
 *
 * Idle, the icon gently scales/breathes; hovering highlights the whole hint as
 * a rounded pill/circle (and pauses the motion). Its color rides the
 * `--hint` token, so it re-skins with the theme and never collides with a status
 * color. Pair with a `HoverCard`/`Tooltip` to reveal the actual tip.
 *
 * Sitting flush against a container edge, add `flush` so the GLYPH lands on that
 * edge rather than the button box — otherwise the hint reads as indented
 * against whatever is stacked above it.
 */
const hintVariants = cva(
  "group/hint inline-flex w-fit items-center gap-1.5 rounded-full text-hint outline-none transition-colors hover:bg-hint/10 focus-visible:bg-hint/10 focus-visible:ring-2 focus-visible:ring-hint/30",
  {
    variants: {
      size: {
        sm: "p-1 text-xs [&_[data-slot=hint-icon]]:size-4",
        default: "px-2.5 py-2 text-sm [&_[data-slot=hint-icon]]:size-6",
      },
      /**
       * Align the visible GLYPH to the container edge, not the button box.
       *
       * Two things indent it, and both have to come back: the container padding
       * (which exists only to give the hover pill body), plus the lightbulb's
       * own margin inside its viewBox — `IconLightBulbSimple` draws from x=5 to
       * x=19 of 24, so with its 2px stroke the bulb starts a clean 1/6 of the
       * icon size in from the edge of its box.
       *
       *   sm:      p-1 (4px)     + 16px / 6 ≈ 2.7px  → 1.5 (6px)
       *   default: px-2.5 (10px) + 24px / 6 = 4px    → 3.5 (14px)
       *
       * Logical (`-ms-`), so RTL follows.
       */
      flush: { true: "", false: "" },
    },
    compoundVariants: [
      { size: "sm", flush: true, class: "-ms-1.5" },
      { size: "default", flush: true, class: "-ms-3.5" },
    ],
    defaultVariants: {
      size: "default",
      flush: false,
    },
  },
);

export function Hint({
  className,
  size,
  flush,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof hintVariants>) {
  return (
    <button
      type="button"
      data-slot="hint"
      className={cn(hintVariants({ size, flush }), className)}
      {...props}
    />
  );
}

export function HintIcon({ className }: { className?: string }) {
  return (
    <span
      data-slot="hint-icon"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        className,
      )}
    >
      {/* The glyph gently "breathes" — a subtle scale once every ~10s (the only
          idle motion), paused on hover (which shows the full highlight instead)
          and for reduced-motion users. */}
      <HintGlyph
        aria-hidden
        className="size-full animate-hint-breathe group-hover/hint:animate-none motion-reduce:animate-none"
      />
    </span>
  );
}

export function HintText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="hint-text"
      // `leading-none` so the box is the text's own em box rather than the
      // font-size's default line-height. Otherwise the half-leading (4px at
      // `text-xs`) pads the box symmetrically while the letters — this label has
      // no descenders — sit in its upper half, so centring against the glyph
      // lands the text visibly high.
      className={cn("font-medium leading-none", className)}
      {...props}
    />
  );
}

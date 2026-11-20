import type { ComponentProps, ReactNode } from "react";

import { cva } from "class-variance-authority";

import type { SocialProvider } from "~/lib/post-for-me.types";
import { cn } from "~/lib/utils";
import { Avatar, AvatarFallback } from "~/ui/avatar";
import { BrandMark } from "~/ui/brand-mark";

export type PlatformAvatarBadgePlacement = "default" | "secondary";

// A positioning wrapper for a corner badge — the same composable interface as
// UserAvatarBadge, but tuned for the rounded-SQUARE corners (the badge centers ON
// the box corner). It does NOT size or style its content — the pre-styled content
// badges own their sizing and knockout.
const platformAvatarBadgeVariants = cva(
  "absolute z-10 inline-flex -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 items-center justify-center",
  {
    defaultVariants: { placement: "default" },
    variants: {
      placement: {
        // Pulled in off the exact corner so it straddles the rounded edge
        // instead of floating in the cut-off corner.
        default: "start-[90%] top-[90%]", // lower-trailing
        secondary: "start-[10%] top-[10%]", // upper-leading
      },
    },
  },
);

/**
 * A **platform** identity (a social network): the provider's brand mark on the active
 * style's surface fill, in a **rounded square** box — the counterpart to the User
 * avatar (circle). It forwards `size` to the base Avatar and adopts the selected
 * style's surface (fill via `cn-avatar-fill`, border via `cn-avatar-ring`) and corner
 * radius (`cn-avatar-radius`, scaled per size), so it reads native under each style.
 * Sizing stays with the Avatar primitive. Compose {@link PlatformAvatarBadge} children
 * to decorate the corners.
 */
export function PlatformAvatar({
  platform,
  size = "default",
  className,
  children,
  ...props
}: {
  children?: ReactNode;
  platform: SocialProvider;
  size?: ComponentProps<typeof Avatar>["size"];
} & Omit<ComponentProps<typeof Avatar>, "children" | "size">) {
  return (
    <Avatar
      size={size}
      className={cn(
        // Adopt the active style's surface: `cn-avatar-radius` sets --ar (the style's
        // corner), `cn-avatar-ring` its border color. Scale --ar per size on the box +
        // its `after:` ring so a small square never clamps to a circle. Sizing stays
        // with the Avatar primitive.
        "[--ar:var(--radius)] after:border-input [&_svg]:size-3/5",
        "data-[size=sm]:rounded-[calc(var(--ar)*0.75)] data-[size=sm]:after:rounded-[calc(var(--ar)*0.75)]",
        "data-[size=default]:rounded-[var(--ar)] data-[size=default]:after:rounded-[var(--ar)]",
        "data-[size=lg]:rounded-[calc(var(--ar)*1.25)] data-[size=lg]:after:rounded-[calc(var(--ar)*1.25)]",
        className,
      )}
      {...props}
    >
      <AvatarFallback className="bg-muted text-foreground rounded-[inherit]">
        <BrandMark platform={platform} />
      </AvatarFallback>
      {children}
    </Avatar>
  );
}

/**
 * A decorator slot on a {@link PlatformAvatar}: positions a corner badge —
 * the same interface as `UserAvatarBadge`. `placement` picks the corner
 * (`default` = lower-trailing, `secondary` = upper-leading).
 *
 * Put a {@link PlatformAvatarIconBadge} or {@link PlatformAvatarStatusBadge}
 * inside — they own their sizing and knockout. The wrapper is placement only.
 */
export function PlatformAvatarBadge({
  placement = "default",
  className,
  children,
  ...props
}: {
  children?: ReactNode;
  placement?: PlatformAvatarBadgePlacement;
} & ComponentProps<"span">) {
  return (
    <span
      data-slot="platform-avatar-badge"
      className={cn(platformAvatarBadgeVariants({ placement }), className)}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * A pre-styled corner fill for a brand mark or icon on a {@link PlatformAvatar} —
 * the square-avatar counterpart to {@link UserAvatarIconBadge}. A `bg-background`
 * knockout disc; any `svg` inside is forced to `size-3` by a child selector (a
 * class + a type selector, which out-ranks a `size-*` on the svg). Place inside a
 * {@link PlatformAvatarBadge} for placement.
 */
export function PlatformAvatarIconBadge({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      data-slot="platform-avatar-icon-badge"
      className={cn(
        "flex items-center justify-center rounded-full bg-background",
        // Tracks the ancestor Avatar's `data-size` (`group/avatar`).
        "p-1 [&_svg]:size-3",
        "group-data-[size=sm]/avatar:p-0 group-data-[size=sm]/avatar:[&_svg]:size-2.5",
        "group-data-[size=lg]/avatar:p-1 group-data-[size=lg]/avatar:[&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A pre-styled corner fill for a status dot on a {@link PlatformAvatar} — the
 * square-avatar counterpart to {@link UserAvatarStatusBadge}. Owns the
 * indicator's size (`size-2.5`) and its `ring-background` knockout via a
 * `[data-slot=status-indicator]` child selector. Place inside a
 * {@link PlatformAvatarBadge}.
 */
export function PlatformAvatarStatusBadge({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      data-slot="platform-avatar-status-badge"
      className={cn(
        "inline-flex items-center justify-center",
        // Tracks the ancestor Avatar's `data-size` (`group/avatar`).
        "[&_[data-slot=status-indicator]]:size-2.5",
        "group-data-[size=sm]/avatar:[&_[data-slot=status-indicator]]:size-2",
        "group-data-[size=lg]/avatar:[&_[data-slot=status-indicator]]:size-3",
        "[&_[data-slot=status-indicator]]:ring-2 [&_[data-slot=status-indicator]]:ring-background",
        className,
      )}
      {...props}
    />
  );
}

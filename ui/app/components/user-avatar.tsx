import type { ComponentProps, ReactNode } from "react";

import { cva } from "class-variance-authority";

import { cn } from "~/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "~/ui/avatar";
import { IconPlaceholder } from "~/ui/icon-placeholder";

export type UserAvatarVariant = "default" | "prominent";
export type UserAvatarBadgePlacement = "default" | "secondary";

/**
 * A positioned decorator slot. `placement` picks the corner; the placed element
 * (a StatusIndicator, a PlatformAvatar, …) gets a ring so it reads as notched
 * into the avatar (and its own border overlay, if any, is dropped).
 */
const userAvatarBadgeVariants = cva(
  // A positioning wrapper, nothing more: it centers the placed badge ON the
  // circular avatar's edge (via -translate-1/2 off the placement point) so it
  // straddles the edge. It does NOT size or style the content — the pre-styled
  // content badges ({@link UserAvatarIconBadge}, {@link UserAvatarStatusBadge})
  // own their sizing and knockout.
  "absolute z-10 inline-flex -translate-x-1/2 -translate-y-1/2 items-center justify-center",
  {
    defaultVariants: { placement: "default" },
    variants: {
      placement: {
        default: "start-[85%] top-[85%]", // lower-trailing
        secondary: "start-[15%] top-[15%]", // upper-leading
      },
    },
  },
);

/** Two-letter initials from a name/handle, for the dummy fill. */
function initials(name?: string | null): string {
  const cleaned = (name ?? "").trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

/**
 * A **user** identity: a **circle** showing the profile photo when present, else
 * the initials of `name`, else a generic user icon. Forwards `size` to the base
 * Avatar. Compose {@link UserAvatarBadge} children to decorate the corners.
 */
export function UserAvatar({
  name,
  src,
  size = "default",
  variant = "default",
  className,
  children,
  ...props
}: {
  children?: ReactNode;
  name?: string | null;
  size?: ComponentProps<typeof Avatar>["size"];
  src?: string | null;
  variant?: UserAvatarVariant;
} & Omit<ComponentProps<typeof Avatar>, "children" | "size">) {
  const text = initials(name);

  return (
    <Avatar size={size} className={cn("cn-avatar-ring", className)} {...props}>
      {src ? <AvatarImage src={src} alt={name ?? ""} /> : null}
      <AvatarFallback
        data-variant={variant}
        className={cn(
          // The `default` surface adopts the active style's fill via `cn-avatar-fill`;
          // `prominent` is an emphasis override that stays primary in every style.
          "cn-avatar-fill font-medium uppercase [&_svg]:size-3/5",
          "data-[variant=prominent]:bg-primary data-[variant=prominent]:text-primary-foreground",
        )}
      >
        {text || (
          <IconPlaceholder
            lucide="User"
            tabler="IconUser"
            phosphor="User"
            hugeicons="UserIcon"
            remixicon="RiUserLine"
            aria-hidden
          />
        )}
      </AvatarFallback>
      {children}
    </Avatar>
  );
}

/**
 * A decorator slot on a {@link UserAvatar}: positions a corner badge. `placement`
 * picks the corner (`default` = lower-trailing, `secondary` = upper-leading).
 *
 * Put a {@link UserAvatarIconBadge} (a brand mark or icon) or a
 * {@link UserAvatarStatusBadge} (a status dot) inside — they own their own sizing
 * and knockout. The wrapper is placement only.
 */
export function UserAvatarBadge({
  placement = "default",
  className,
  children,
  ...props
}: {
  children?: ReactNode;
  placement?: UserAvatarBadgePlacement;
} & ComponentProps<"span">) {
  return (
    <span
      data-slot="user-avatar-badge"
      className={cn(userAvatarBadgeVariants({ placement }), className)}
      {...props}
    >
      {children}
    </span>
  );
}

// The disc's icon size + padding, tracking the ancestor Avatar's `data-size`
// (`group/avatar`), so a badge is proportional on a small chip or a large tile
// without being told. shadcn's own AvatarBadge scales the same way.
const iconBadgeSizing = [
  "p-1 [&_svg]:size-3", // default (size-8 avatar) → ~20px disc
  // sm needs its own padding (not p-0): without a gap the mark fills the disc
  // edge-to-edge and the knockout reads as a floating glyph, not a punched notch.
  "group-data-[size=sm]/avatar:p-0.5 group-data-[size=sm]/avatar:[&_svg]:size-2.5",
  "group-data-[size=lg]/avatar:p-1 group-data-[size=lg]/avatar:[&_svg]:size-3.5",
].join(" ");

// The dot size, tracking the ancestor Avatar's `data-size`.
const statusBadgeSizing = [
  "[&_[data-slot=status-indicator]]:size-2.5", // default
  "group-data-[size=sm]/avatar:[&_[data-slot=status-indicator]]:size-2",
  "group-data-[size=lg]/avatar:[&_[data-slot=status-indicator]]:size-3",
].join(" ");

/**
 * A pre-styled corner fill for a brand mark or icon: a surface-colored disc that
 * reads as a knockout — a hole punched through the avatar to the surface behind —
 * with the icon centered in it. Drop a `BrandMark` or any icon straight in.
 *
 * **Opinionated sizing.** Any `svg` inside is forced to size by a child selector,
 * on purpose: `.badge svg` (a class + a type selector) out-ranks a `size-*` class
 * on the svg itself, so the badge decides the size even if the icon ships its own.
 * The size tracks the ancestor {@link UserAvatar}'s `size`, so it's proportional
 * everywhere. Place inside a {@link UserAvatarBadge} for the corner position.
 */
export function UserAvatarIconBadge({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      data-slot="user-avatar-icon-badge"
      className={cn(
        "flex items-center justify-center rounded-full bg-background",
        iconBadgeSizing,
        className,
      )}
      {...props}
    />
  );
}

/**
 * A pre-styled corner fill for a {@link StatusIndicator} (or any element marked
 * `data-slot="status-indicator"`). Drop a bare `<StatusIndicator status="…" />`
 * in — the `[data-slot=status-indicator]` child selector (two selectors) out-ranks
 * a `size-*` class on the dot, so the badge owns BOTH the size and the knockout:
 * a `ring-background` around the dot reads as it being punched into the avatar.
 * The size tracks the ancestor {@link UserAvatar}'s `size`. Place inside a
 * {@link UserAvatarBadge} for corner placement.
 */
export function UserAvatarStatusBadge({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      data-slot="user-avatar-status-badge"
      className={cn(
        "inline-flex items-center justify-center",
        statusBadgeSizing,
        "[&_[data-slot=status-indicator]]:ring-2 [&_[data-slot=status-indicator]]:ring-background",
        className,
      )}
      {...props}
    />
  );
}

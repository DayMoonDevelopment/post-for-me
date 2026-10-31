"use client";

import type { ComponentProps, ReactNode } from "react";

import { UserAvatar } from "~/components/user-avatar";
import type { SocialProvider } from "~/lib/post-for-me.types";
import { BrandMark } from "~/ui/brand-mark";
import { IconPlaceholder } from "~/ui/icon-placeholder";
import { cn } from "~/lib/utils";

/**
 * A compact **identity pill** — a small {@link UserAvatar} plus a label — for showing
 * an account/user inline: a selected-account badge, a recipient token, a "posting as…"
 * marker. Named for shadcn's `Badge` the way {@link UserAvatar} is named for `Avatar`.
 *
 * Trailing edge, in order of precedence:
 * - `platform` + `onRemove` → the platform brand mark at rest that swaps to `×` when
 *   the badge is hovered/focused (the mark doubles as the remove affordance).
 * - `onRemove` only → a plain `×`.
 * - `platform` only → a static brand mark (a non-removable account indicator).
 *
 * Decorate the avatar itself (a status dot, a corner platform notch) by passing
 * `UserAvatarBadge` children — they forward to the inner avatar.
 */
export function UserBadge({
  name,
  src,
  size = "sm",
  platform,
  onRemove,
  label,
  className,
  children,
  ...props
}: {
  name?: string | null;
  src?: string | null;
  size?: ComponentProps<typeof UserAvatar>["size"];
  /**
   * The account's platform. Renders a brand mark on the trailing edge; combined
   * with `onRemove` it becomes the remove control — brand at rest, `×` on hover.
   */
  platform?: SocialProvider;
  /** When set, the trailing edge removes the badge (a `×`, or a hover-revealed `×`). */
  onRemove?: () => void;
  /** Override the visible label (defaults to `name`). */
  label?: ReactNode;
  /** Avatar decorators (a `UserAvatarBadge` with a status dot / corner platform notch). */
  children?: ReactNode;
} & Omit<ComponentProps<"span">, "children">) {
  const labelContent = label ?? name;
  const removeIcon = (
    <IconPlaceholder
      lucide="X"
      tabler="IconX"
      phosphor="X"
      hugeicons="Cancel01Icon"
      remixicon="RiCloseLine"
      className="size-3"
      aria-hidden
    />
  );

  return (
    <span
      data-slot="user-badge"
      className={cn(
        // `cn-badge-inset` is the padding each style tunes: `py` clears the avatar's
        // overhanging notch, `ps` sits the avatar snug on the leading edge, and `pe` gives
        // the trailing label/action a wider chip gutter (avatars fill toward an edge more
        // than text/×, so equal insets read lopsided). `cn-badge-radius` tracks the
        // style's Badge corner — a pill in the round styles, sharp (`rounded-none`) in the
        // hard-bordered ones (sera/lyra). `group/badge` lets the trailing control reveal
        // its `×` on hover/focus of the whole chip.
        "group/badge cn-badge-inset cn-badge-radius inline-flex w-fit items-center gap-1.5 border border-input bg-background text-xs font-medium select-none",
        className,
      )}
      {...props}
    >
      <UserAvatar name={name} src={src} size={size}>
        {children}
      </UserAvatar>
      {/* `min-w-0 truncate` lets the label ellipsize when the consumer caps the badge
          width (e.g. `className="max-w-40"`); the avatar and trailing action stay put
          (they're `shrink-0`). `title` surfaces the full value on hover when it's clipped. */}
      <span
        data-slot="user-badge-label"
        title={typeof labelContent === "string" ? labelContent : undefined}
        className="min-w-0 truncate"
      >
        {labelContent}
      </span>
      {onRemove ? (
        <button
          type="button"
          data-slot="user-badge-remove"
          onClick={onRemove}
          aria-label={typeof name === "string" ? `Remove ${name}` : "Remove"}
          className="cn-badge-radius relative inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {platform ? (
            // The brand mark rests in the remove slot; hovering/focusing the badge cross-
            // fades it out and the `×` in — the platform indicator doubles as the affordance.
            // Both faces are absolutely co-centered so they overlap exactly (no ghosting),
            // and each animates opacity + a slight scale on the same 150ms ease-out curve.
            <>
              <span className="absolute inset-0 grid place-items-center transition-[opacity,transform] duration-150 ease-out group-hover/badge:scale-90 group-hover/badge:opacity-0 group-focus-within/badge:scale-90 group-focus-within/badge:opacity-0">
                <BrandMark platform={platform} aria-hidden className="size-3.5" />
              </span>
              <span className="absolute inset-0 grid scale-90 place-items-center opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover/badge:scale-100 group-hover/badge:opacity-100 group-focus-within/badge:scale-100 group-focus-within/badge:opacity-100">
                {removeIcon}
              </span>
            </>
          ) : (
            removeIcon
          )}
        </button>
      ) : platform ? (
        <BrandMark
          platform={platform}
          aria-hidden
          className="size-3.5 shrink-0"
        />
      ) : null}
    </span>
  );
}

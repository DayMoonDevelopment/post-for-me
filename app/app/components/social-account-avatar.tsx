import type { AvatarSize } from "~/lib/avatar";
import type {
  SocialAccount,
  SocialAccountStatus,
} from "~/lib/types/social-account";
import type { StatusName } from "~/ui/status-indicator";

import {
  UserAvatar,
  UserAvatarBadge,
  UserAvatarStatusBadge,
} from "~/components/user-avatar";
import { platformMeta } from "~/lib/platform-meta";
import { StatusIndicator } from "~/ui/status-indicator";

/**
 * Connection-health → status name. `connected` reads success, `expired` warning,
 * `disconnected` muted — the single place the tri-state maps to a status, shared
 * by the list grid identity cell and the detail page header so they can't
 * disagree.
 */
const STATUS_NAME: Record<SocialAccountStatus, StatusName> = {
  connected: "success",
  expired: "warning",
  disconnected: "default",
};

/**
 * A connected account's owner as a {@link UserAvatar} — the profile photo, else
 * the handle's initials, else a user icon — with a lower-trailing status dot
 * implying connection health. The account is a USER, so it's circular; the
 * PLATFORM mark is surfaced by the consumer next to the label (see the grid
 * identity cell), not baked in here. The status badge owns the dot's size and its
 * knockout ring; `ringClassName` matches that ring to the surface behind the
 * avatar (defaults to `ring-background`; pass `ring-card` on a card).
 */
export function SocialAccountAvatar({
  account,
  size = "default",
  className,
  ringClassName = "ring-background",
}: {
  account: Pick<
    SocialAccount,
    "platform" | "username" | "avatarUrl" | "status"
  >;
  className?: string;
  ringClassName?: string;
  size?: AvatarSize;
}) {
  const label =
    account.username ??
    platformMeta(account.platform)?.label ??
    account.platform;

  return (
    <UserAvatar
      name={label}
      src={account.avatarUrl}
      size={size}
      className={className}
    >
      <UserAvatarBadge placement="default">
        {/* The badge rings `ring-background` by default; on a card, override the
            ring color through the same child selector so it wins the merge. */}
        <UserAvatarStatusBadge
          className={
            ringClassName === "ring-card"
              ? "[&_[data-slot=status-indicator]]:ring-card"
              : undefined
          }
        >
          <StatusIndicator status={STATUS_NAME[account.status]} />
        </UserAvatarStatusBadge>
      </UserAvatarBadge>
    </UserAvatar>
  );
}

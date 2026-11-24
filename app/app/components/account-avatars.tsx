import type { ComponentProps } from "react";

import type { AvatarSize } from "~/lib/avatar";
import type {
  PostAccountIdentity,
  PostAccountStatus,
} from "~/lib/types/social-post";
import type { StatusName } from "~/ui/status-indicator";

import {
  UserAvatar,
  UserAvatarBadge,
  UserAvatarIconBadge,
  UserAvatarStatusBadge,
} from "~/components/user-avatar";
import { brandProvider, platformMeta } from "~/lib/platform-meta";
import { cn } from "~/lib/utils";
import { AvatarGroup, AvatarGroupCount } from "~/ui/avatar";
import { BrandMark } from "~/ui/brand-mark";
import { StatusIndicator } from "~/ui/status-indicator";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/ui/tooltip";

/** Per-account result → status (none for pending: no dot is shown). */
const STATUS_DOT: Record<PostAccountStatus, StatusName | null> = {
  pending: null,
  success: "success",
  error: "destructive",
};

/**
 * A social account as an avatar: a {@link UserAvatar} (the account owner — circle,
 * photo or dummy) with a lower-trailing platform badge and an upper-leading
 * result dot. No tooltip. Reused by the post detail page's per-account rows.
 * `size` drives the avatar + its accessories.
 */
export function PostAccountAvatar({
  account,
  status,
  showStatus = true,
  size = "sm",
  ...props
}: {
  account: PostAccountIdentity;
  /** Render the upper-leading result dot. Off in the overflow list, where the
   * row carries its own trailing status dot instead. */
  showStatus?: boolean;
  size?: AvatarSize;
  status: PostAccountStatus;
} & Omit<
  ComponentProps<typeof UserAvatar>,
  "children" | "name" | "size" | "src"
>) {
  const dot = showStatus ? STATUS_DOT[status] : null;
  return (
    <UserAvatar
      name={account.username ?? platformMeta(account.platform)?.label}
      src={account.avatarUrl}
      size={size}
      {...props}
    >
      <UserAvatarBadge placement="default">
        <UserAvatarIconBadge>
          <BrandMark platform={brandProvider(account.platform)} />
        </UserAvatarIconBadge>
      </UserAvatarBadge>
      {dot ? (
        <UserAvatarBadge placement="secondary">
          <UserAvatarStatusBadge>
            <StatusIndicator status={dot} />
          </UserAvatarStatusBadge>
        </UserAvatarBadge>
      ) : null}
    </UserAvatar>
  );
}

/** One account avatar (grid) under a hover tooltip naming the account + its ids.
 * The list carries no per-account result, so no status dot is shown here (the
 * badge lives on the post detail page). */
function AccountAvatar({
  account,
  className,
}: {
  account: PostAccountIdentity;
  className?: string;
}) {
  const meta = platformMeta(account.platform);
  const label = account.username ?? meta?.label ?? account.platform;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <PostAccountAvatar
            account={account}
            status="pending"
            showStatus={false}
            className={className}
          />
        }
      />
      {/* Leading-aligned (logical, RTL-aware), compact: handle + the ids,
          ids truncated. */}
      <TooltipContent className="flex w-56 flex-col items-start gap-1 text-start">
        <span className="w-full truncate text-xs font-medium">{label}</span>
        <span className="w-full truncate font-mono text-[0.6875rem] text-background/60">
          {account.id}
        </span>
        {account.externalId ? (
          <span className="w-full truncate font-mono text-[0.6875rem] text-background/50">
            {account.externalId}
          </span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

/** One overflow account as a row: avatar (with platform badge) · username
 * (truncated). Listed in the `+N` tooltip (a dark surface), so the avatar is
 * wrapped in a `.dark` scope to invert monochrome brand marks. The list has no
 * per-account result, so no status dot is shown. */
function OverflowAccountRow({ account }: { account: PostAccountIdentity }) {
  const meta = platformMeta(account.platform);
  const label = account.username ?? meta?.label ?? account.platform;
  return (
    <div className="flex items-center gap-2">
      <span className="dark inline-flex">
        <PostAccountAvatar
          account={account}
          status="pending"
          showStatus={false}
          size="sm"
          className="shrink-0"
        />
      </span>
      <span className="min-w-0 flex-1 truncate text-xs">{label}</span>
    </div>
  );
}

/**
 * The account-avatars cell (PFM-701): a tidy row of the accounts a post targets —
 * each a {@link PostAccountAvatar}, under a hover tooltip carrying the account id /
 * external id. Beyond `max`, the surplus collapses into a `+N` chip whose tooltip
 * lists them as rows. Pure presentation; reused by the posts grid. The list
 * carries identity only (no per-account result), so no status dots are shown.
 *
 * Avatars sit INLINE rather than overlapping — each one carries a platform badge,
 * and a stack hides the badge of every avatar but the last.
 */
export function AccountAvatars({
  accounts,
  max = 5,
  className,
  avatarClassName,
}: {
  accounts: PostAccountIdentity[];
  avatarClassName?: string;
  className?: string;
  /** How many avatars to show before collapsing the rest into `+N`. */
  max?: number;
}) {
  if (accounts.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const visible = accounts.slice(0, max);
  const overflowAccounts = accounts.slice(max);

  return (
    <AvatarGroup
      className={cn(
        // Lay the avatars out inline instead of stacked. `AvatarGroup` overlaps
        // via `-space-x-2` and rings each avatar in the page background so the
        // overlap reads cleanly — with a real gap that ring has nothing to
        // separate, and shows as a mismatched halo once the row tints on hover.
        // The component itself stays: `AvatarGroupCount` (the `+N` chip) sizes
        // itself off its `group/avatar-group` scope.
        "space-x-0 gap-1.5 *:data-[slot=avatar]:ring-0",
        className,
      )}
    >
      {visible.map((account) => (
        <AccountAvatar
          key={account.id}
          account={account}
          className={avatarClassName}
        />
      ))}
      {overflowAccounts.length > 0 ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <AvatarGroupCount className={avatarClassName}>
                +{overflowAccounts.length}
              </AvatarGroupCount>
            }
          />
          {/* The remaining accounts as rows: avatar · username · result dot.
              `items-stretch` overrides the tooltip's default `items-center` so the
              rows fill the width — avatars line up leading, dots line up trailing. */}
          <TooltipContent className="flex max-w-64 flex-col items-stretch gap-1.5 text-start">
            {overflowAccounts.map((account) => (
              <OverflowAccountRow key={account.id} account={account} />
            ))}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </AvatarGroup>
  );
}

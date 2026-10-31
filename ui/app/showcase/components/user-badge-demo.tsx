import {
  UserAvatarBadge,
  UserAvatarIconBadge,
  UserAvatarStatusBadge,
} from "~/components/user-avatar";
import { UserBadge } from "~/components/user-badge";
import { BrandMark } from "~/ui/brand-mark";
import { StatusIndicator } from "~/ui/status-indicator";

const noop = () => {};

export function UserBadgePreview() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <UserBadge name="Jane Doe" />
      <UserBadge name="Marcus Lee" />
      <UserBadge name="postforme" />
    </div>
  );
}

export function UserBadgeRemovable() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <UserBadge name="Jane Doe" onRemove={noop} />
      <UserBadge name="Marcus Lee" onRemove={noop} />
      <UserBadge name="postforme" onRemove={noop} />
    </div>
  );
}

export function UserBadgePlatform() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Platform on the trailing edge; with onRemove it rests as the brand mark and
          reveals the × on hover/focus of the chip — hover one to see the swap. */}
      <UserBadge name="Jane Doe" platform="instagram" onRemove={noop} />
      <UserBadge name="Marcus Lee" platform="tiktok" onRemove={noop} />
      <UserBadge name="postforme" platform="linkedin" onRemove={noop} />
    </div>
  );
}

export function UserBadgeTruncated() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Cap the width with `max-w-*` and the label ellipsizes; the avatar + trailing
          action keep their size. Hover the label to see the full name (native title). */}
      <UserBadge
        className="max-w-40"
        name="Alexandria Konstantinopoulos"
        platform="instagram"
        onRemove={noop}
      />
      <UserBadge
        className="max-w-32"
        name="Bartholomew Fotheringham"
        onRemove={noop}
      />
    </div>
  );
}

export function UserBadgeDecorated() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status dot on the avatar — the account-badge use. */}
      <UserBadge name="Jane Doe" onRemove={noop}>
        <UserAvatarBadge>
          <UserAvatarStatusBadge>
            <StatusIndicator status="success" />
          </UserAvatarStatusBadge>
        </UserAvatarBadge>
      </UserBadge>
      {/* A platform mark on the avatar — the icon badge scales itself to the
          avatar's size, so a small chip gets a small notch. */}
      <UserBadge name="Marcus Lee" onRemove={noop}>
        <UserAvatarBadge>
          <UserAvatarIconBadge>
            <BrandMark platform="instagram" />
          </UserAvatarIconBadge>
        </UserAvatarBadge>
      </UserBadge>
    </div>
  );
}

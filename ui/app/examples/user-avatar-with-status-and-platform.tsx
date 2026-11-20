import {
  UserAvatar,
  UserAvatarBadge,
  UserAvatarIconBadge,
  UserAvatarStatusBadge,
} from "~/components/user-avatar";
import { BrandMark } from "~/ui/brand-mark";
import { StatusIndicator } from "~/ui/status-indicator";

export function UserAvatarWithStatusAndPlatform() {
  return (
    <UserAvatar name="Jane Doe" src="https://i.pravatar.cc/80?img=12" size="lg">
      <UserAvatarBadge placement="default">
        <UserAvatarIconBadge>
          <BrandMark platform="instagram" />
        </UserAvatarIconBadge>
      </UserAvatarBadge>
      <UserAvatarBadge placement="secondary">
        <UserAvatarStatusBadge>
          <StatusIndicator status="success" />
        </UserAvatarStatusBadge>
      </UserAvatarBadge>
    </UserAvatar>
  );
}

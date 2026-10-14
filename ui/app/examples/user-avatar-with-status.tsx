import {
  UserAvatar,
  UserAvatarBadge,
  UserAvatarStatusBadge,
} from "~/components/user-avatar";
import { StatusIndicator } from "~/ui/status-indicator";

export function UserAvatarWithStatus() {
  return (
    <UserAvatar name="Jane Doe" size="lg">
      <UserAvatarBadge placement="default">
        <UserAvatarStatusBadge>
          <StatusIndicator status="success" />
        </UserAvatarStatusBadge>
      </UserAvatarBadge>
    </UserAvatar>
  );
}

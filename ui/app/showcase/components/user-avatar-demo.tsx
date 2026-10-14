import { UserAvatar } from "~/components/user-avatar";
import { UserAvatarWithStatus } from "~/examples/user-avatar-with-status";
import { UserAvatarWithStatusAndPlatform } from "~/examples/user-avatar-with-status-and-platform";

export function UserAvatarPreview() {
  return (
    <div className="flex items-center gap-4">
      <UserAvatar name="With Photo" src="https://i.pravatar.cc/80?img=12" size="lg" />
      <UserAvatar name="Soft Default" size="lg" />
      <UserAvatar size="lg" />
      <UserAvatarWithStatus />
      <UserAvatarWithStatusAndPlatform />
    </div>
  );
}

export function UserAvatarFallback() {
  return (
    <div className="flex items-center gap-4">
      <UserAvatar name="With Photo" src="https://i.pravatar.cc/80?img=5" size="lg" />
      <UserAvatar name="Jane Doe" size="lg" />
      <UserAvatar size="lg" />
    </div>
  );
}

export { UserAvatarWithStatus, UserAvatarWithStatusAndPlatform };

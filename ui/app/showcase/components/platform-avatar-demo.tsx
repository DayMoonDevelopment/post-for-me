import {
  PlatformAvatar,
  PlatformAvatarBadge,
  PlatformAvatarStatusBadge,
} from "~/components/platform-avatar";
import { StatusIndicator } from "~/ui/status-indicator";

const PLATFORMS = [
  "instagram",
  "tiktok",
  "x",
  "facebook",
  "youtube",
  "linkedin",
  "pinterest",
  "threads",
  "bluesky",
] as const;

export function PlatformAvatarPreview() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {PLATFORMS.map((platform) => (
        <PlatformAvatar key={platform} platform={platform} size="lg" />
      ))}
    </div>
  );
}

export function PlatformAvatarSizes() {
  return (
    <div className="flex items-end gap-4">
      <PlatformAvatar platform="instagram" size="sm" />
      <PlatformAvatar platform="instagram" size="default" />
      <PlatformAvatar platform="instagram" size="lg" />
    </div>
  );
}

export function PlatformAvatarStatus() {
  return (
    <div className="flex items-center gap-4">
      <PlatformAvatar platform="instagram" size="lg">
        <PlatformAvatarBadge placement="default">
          <PlatformAvatarStatusBadge>
            <StatusIndicator status="success" />
          </PlatformAvatarStatusBadge>
        </PlatformAvatarBadge>
      </PlatformAvatar>
      <PlatformAvatar platform="tiktok" size="lg">
        <PlatformAvatarBadge placement="default">
          <PlatformAvatarStatusBadge>
            <StatusIndicator status="warning" />
          </PlatformAvatarStatusBadge>
        </PlatformAvatarBadge>
      </PlatformAvatar>
      <PlatformAvatar platform="youtube" size="lg">
        <PlatformAvatarBadge placement="default">
          <PlatformAvatarStatusBadge>
            <StatusIndicator status="default" />
          </PlatformAvatarStatusBadge>
        </PlatformAvatarBadge>
      </PlatformAvatar>
    </div>
  );
}

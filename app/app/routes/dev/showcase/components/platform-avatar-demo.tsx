import {
  PlatformAvatar,
  PlatformAvatarBadge,
  PlatformAvatarStatusBadge,
} from "~/components/platform-avatar";
import { type AvatarSize } from "~/lib/avatar";
import { StatusIndicator } from "~/ui/status-indicator";

import { Section } from "./section";

const SIZES: AvatarSize[] = ["sm", "default", "lg"];

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

export function PlatformAvatarDemo() {
  return (
    <div className="space-y-8">
      <Section title="Every provider — rounded, muted container + brand mark">
        <div className="flex flex-wrap items-center gap-3">
          {PLATFORMS.map((platform) => (
            <PlatformAvatar key={platform} platform={platform} size="lg" />
          ))}
        </div>
      </Section>

      <Section title="Size scale (sm → lg)">
        <div className="flex items-end gap-4">
          {SIZES.map((size) => (
            <div key={size} className="flex flex-col items-center gap-1.5">
              <PlatformAvatar platform="instagram" size={size} />
              <span className="text-[0.625rem] text-muted-foreground">
                {size}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="With a status dot (project-settings style)">
        <div className="flex items-center gap-4">
          <PlatformAvatar platform="instagram" size="lg">
            <PlatformAvatarBadge>
              <PlatformAvatarStatusBadge>
                <StatusIndicator status="success" />
              </PlatformAvatarStatusBadge>
            </PlatformAvatarBadge>
          </PlatformAvatar>
          <PlatformAvatar platform="tiktok" size="lg">
            <PlatformAvatarBadge>
              <PlatformAvatarStatusBadge>
                <StatusIndicator status="warning" />
              </PlatformAvatarStatusBadge>
            </PlatformAvatarBadge>
          </PlatformAvatar>
          <PlatformAvatar platform="youtube" size="lg">
            <PlatformAvatarBadge>
              <PlatformAvatarStatusBadge>
                <StatusIndicator status="default" />
              </PlatformAvatarStatusBadge>
            </PlatformAvatarBadge>
          </PlatformAvatar>
        </div>
      </Section>
    </div>
  );
}

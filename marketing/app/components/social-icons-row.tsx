import { cn } from "~/lib/utils";

import { BlueskyBrandIcon } from "./bluesky-brand-icon";
import { FacebookBrandIcon } from "./facebook-brand-icon";
import { InstagramBrandIcon } from "./instagram-brand-icon";
import { LinkedInBrandIcon } from "./linkedin-brand-icon";
import { PinterestBrandIcon } from "./pinterest-brand-icon";
import { ThreadsBrandIcon } from "./threads-brand-icon";
import { TikTokBrandIcon } from "./tiktok-brand-icon";
import { XBrandIcon } from "./x-brand-icon";
import { YouTubeBrandIcon } from "./youtube-brand-icon";

const icons = [
  TikTokBrandIcon,
  FacebookBrandIcon,
  InstagramBrandIcon,
  YouTubeBrandIcon,
  XBrandIcon,
  PinterestBrandIcon,
  LinkedInBrandIcon,
  ThreadsBrandIcon,
  BlueskyBrandIcon,
];

export function SocialIconsRow({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      {icons.map((Icon, index) => (
        <Icon
          key={index}
          className={cn("size-4 text-foreground", iconClassName)}
        />
      ))}
    </div>
  );
}

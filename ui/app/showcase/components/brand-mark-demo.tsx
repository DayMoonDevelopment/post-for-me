import type { ComponentType } from "react";

import type { SocialProvider } from "~/lib/post-for-me.types";

import {
  BlueskyIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  PinterestIcon,
  BrandMark,
  type BrandMarkProps,
  ThreadsIcon,
  TikTokBusinessIcon,
  TikTokIcon,
  XIcon,
  YouTubeIcon,
} from "~/ui/brand-mark";

// Every brand mark is exported by name. TikTok Business is a standalone,
// secondary official TikTok API, so the TikTok mark ships under both TikTokIcon
// and TikTokBusinessIcon.
const ICON_EXPORTS: Array<[name: string, Icon: ComponentType<BrandMarkProps>]> = [
  ["BlueskyIcon", BlueskyIcon],
  ["FacebookIcon", FacebookIcon],
  ["InstagramIcon", InstagramIcon],
  ["LinkedInIcon", LinkedInIcon],
  ["PinterestIcon", PinterestIcon],
  ["ThreadsIcon", ThreadsIcon],
  ["TikTokIcon", TikTokIcon],
  ["TikTokBusinessIcon", TikTokBusinessIcon],
  ["XIcon", XIcon],
  ["YouTubeIcon", YouTubeIcon],
];

const PLATFORMS: SocialProvider[] = [
  "instagram",
  "tiktok",
  "x",
  "facebook",
  "youtube",
  "linkedin",
  "pinterest",
  "threads",
  "bluesky",
];

export function BrandMarkPreview() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {PLATFORMS.map((platform) => (
        <BrandMark key={platform} platform={platform} className="size-7" />
      ))}
    </div>
  );
}

export function BrandMarkSizing() {
  return (
    <div className="flex items-center gap-4">
      <BrandMark platform="instagram" className="size-4" />
      <BrandMark platform="instagram" className="size-6" />
      <BrandMark platform="instagram" className="size-8" />
    </div>
  );
}

export function BrandMarkMonochrome() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-foreground">
      {PLATFORMS.map((platform) => (
        <BrandMark
          key={platform}
          platform={platform}
          variant="monochrome"
          className="size-6"
        />
      ))}
    </div>
  );
}

export function BrandMarkReference() {
  return (
    <div className="grid w-full grid-cols-3 gap-4 sm:grid-cols-5">
      {ICON_EXPORTS.map(([name, Icon]) => (
        <div key={name} className="flex flex-col items-center gap-2">
          <Icon className="size-7" />
          <code className="text-[10px] text-muted-foreground">{name}</code>
        </div>
      ))}
    </div>
  );
}

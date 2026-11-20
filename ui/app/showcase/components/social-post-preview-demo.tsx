import {
  resolveSocialPost,
  SocialPostPreview,
  SocialPostPreviewChrome,
  SocialPostPreviewDevice,
  type SocialPostPreviewInput,
} from "~/components/social-post-preview";

import { SAMPLE_PHOTOS, SAMPLE_VERTICAL_PHOTOS, sampleUser } from "./sample-content";

function acct(id: string, platform: string, handle: string) {
  const user = sampleUser(handle);
  return {
    id,
    platform,
    username: user.handle,
    display_name: user.name,
    profile_photo_url: user.avatarUrl,
  };
}

// A Post for Me social post across four platforms — X and Instagram exercise the feed chromes,
// TikTok the vertical, YouTube the watch page. The configuration cascade is on display:
// Instagram overrides the caption at the PLATFORM level and X at the ACCOUNT level, while
// TikTok / YouTube inherit the post-level caption.
const POST: SocialPostPreviewInput = {
  caption: "Launch day — meet the new social post preview ✨",
  media: [{ url: SAMPLE_PHOTOS[3]! }],
  social_accounts: [
    acct("x-1", "x", "elonmust"),
    acct("ig-1", "instagram", "johnapple"),
    acct("tt-1", "tiktok", "faceberg"),
    acct("yt-1", "youtube", "sundarpixel"),
  ],
  platform_configurations: {
    instagram: { caption: "New preview component — now on the grid 📸" },
  },
  account_configurations: [
    {
      social_account_id: "x-1",
      configuration: { caption: "shipping the preview component today 🚀" },
    },
  ],
};

export function SocialPostPreviewPreview() {
  return <SocialPostPreview post={POST} className="w-full" />;
}

export function SocialPostPreviewManual() {
  // Compose one frame by hand: resolve descriptors from a post, then place a device +
  // chrome yourself. The chrome dispatcher still picks the right surface (TikTok video).
  const [frame] = resolveSocialPost({
    caption: "Behind the scenes 🎬",
    media: [
      {
        url: "https://cdn.example.com/clip.mp4",
        thumbnail_url: SAMPLE_VERTICAL_PHOTOS[0]!,
      },
    ],
    social_accounts: [acct("tt-1", "tiktok", "faceberg")],
    platform_configurations: null,
    account_configurations: null,
  });
  if (!frame) return null;
  return (
    <SocialPostPreviewDevice className="max-w-52">
      <SocialPostPreviewChrome descriptor={frame} />
    </SocialPostPreviewDevice>
  );
}

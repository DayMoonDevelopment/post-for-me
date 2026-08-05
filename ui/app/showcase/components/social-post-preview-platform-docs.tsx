import type { SocialProvider } from "~/lib/post-for-me.types";

/** One exported primitive on a platform's docs page (the bare chrome, or a composable layer). */
export type PlatformPrimitive = { name: string; note: string };

export type PlatformDoc = {
  /** Per-platform intro line for the page header. */
  blurb: string;
  /**
   * A shadcn-style ASCII tree of the primitive hierarchy, shown above the primitives table.
   * Multiple surfaces are separate trees, blank-line separated.
   */
  hierarchy?: string;
  /** The exported components a builder composes for this platform. */
  primitives: PlatformPrimitive[];
  /** A snippet showing how to render / compose those primitives. */
  compose: string;
};

const bare = (chrome: string, note: string): PlatformPrimitive => ({
  name: chrome,
  note,
});

export const PLATFORM_DOCS: Partial<Record<SocialProvider, PlatformDoc>> = {
  x: {
    blurb:
      "The X (Twitter) timeline post — avatar, header, caption, media grid, quote-repost card, and the action row. Strictly-primitive: the XPost shell plus XPostMedia + XPostQuote child slots.",
    hierarchy: `XPost
├── XPostMedia
└── XPostQuote
    └── XPostMedia`,
    primitives: [
      bare(
        "XPost",
        "The post shell — avatar · header · caption · action bar. Drop the media + quote slots inside.",
      ),
      bare(
        "XPostMedia",
        "The 1–4 media grid (videos get a play badge) — flat props (imageSrc, or videoSrc + thumbnailSrc). Also the media inside XPostQuote.",
      ),
      bare(
        "XPostQuote",
        "The embedded quote-tweet card — flat identity + caption + its own media (via XPostMedia); pass `placeholder` for the bare-id skeleton.",
      ),
    ],
    compose: `import {
  XPost,
  XPostMedia,
  XPostQuote,
} from "@/ui/x-chrome";

// XPost is the shell; drop the media + quote slots inside.
<XPost username="jack" displayName="jack" avatarSrc={avatarUrl} caption="gm">
  <XPostMedia imageSrc={[photo1, photo2]} />
  {/* the quote takes media the same way — one URL or an array */}
  <XPostQuote username="dhh" caption="…" imageSrc={photo3} />
</XPost>`,
  },
  instagram: {
    blurb:
      "Instagram has three surfaces: the feed post (with a swipeable carousel), the Reel, and the Story. Strictly-primitive: the InstagramPost feed shell + media slot, plus the InstagramReel / InstagramStory vertical frames with their media + UI layers.",
    hierarchy: `InstagramPost
└── InstagramPostMedia

InstagramReel
├── InstagramReelMedia
└── InstagramReelUI

InstagramStory
├── InstagramStoryMedia
└── InstagramStoryUI`,
    primitives: [
      bare(
        "InstagramPost",
        "The feed post shell — story-ring avatar · username · verified · action row · caption. Drop the media slot inside.",
      ),
      bare(
        "InstagramPostMedia",
        "The feed media — one ratio-fit frame or a swipeable carousel; pass the full media array or flat imageSrc / videoSrc.",
      ),
      bare(
        "InstagramReel",
        "The Reel frame — the relative 9:19.5 container; stack the media + UI inside.",
      ),
      bare(
        "InstagramReelMedia",
        "The Reel media fill + scrim — flat videoSrc / thumbnailSrc / imageSrc.",
      ),
      bare("InstagramReelUI", "The Reel overlay — right action rail + bottom-left meta."),
      bare(
        "InstagramStory",
        "The Story frame — the relative 9:19.5 container; stack the media + UI inside.",
      ),
      bare(
        "InstagramStoryMedia",
        "The Story media fill + scrim — flat videoSrc / thumbnailSrc / imageSrc.",
      ),
      bare(
        "InstagramStoryUI",
        "The Story overlay — progress bar + header + caption chip + send bar.",
      ),
    ],
    compose: `import {
  InstagramPost,
  InstagramPostMedia,
  InstagramReel,
  InstagramReelMedia,
  InstagramReelUI,
} from "@/ui/instagram-chrome";

// Feed — the shell + a media slot (single frame or swipeable carousel):
<InstagramPost username="aperture" avatarSrc={avatarUrl} caption="golden hour ✨">
  <InstagramPostMedia imageSrc={[photo1, photo2]} />
</InstagramPost>

// Reel — the frame + stacked media/UI layers (Story is the same shape):
<InstagramReel>
  <InstagramReelMedia videoSrc={videoUrl} thumbnailSrc={thumbnailUrl} />
  <InstagramReelUI username="aperture" caption="behind the scenes 🎬" />
</InstagramReel>`,
  },
  tiktok: {
    blurb:
      "The TikTok video — full-bleed media with the right action rail and the bottom meta. Strictly-primitive: the TikTokPost frame plus stackable media + UI layers.",
    hierarchy: `TikTokPost
├── TikTokPostMedia
└── TikTokPostUI`,
    primitives: [
      bare(
        "TikTokPost",
        "The video frame — the relative 9:19.5 container; stack the media + UI layers (or your own) inside.",
      ),
      bare(
        "TikTokPostMedia",
        "The media fill layer + scrim — flat props (videoSrc / thumbnailSrc / imageSrc).",
      ),
      bare(
        "TikTokPostUI",
        "The overlay layer — right action rail + bottom-left meta.",
      ),
    ],
    compose: `import {
  TikTokPost,
  TikTokPostMedia,
  TikTokPostUI,
} from "@/ui/tiktok-chrome";

// TikTokPost is the frame (relative 9:19.5); stack the media + UI (or your own) inside.
<TikTokPost>
  <TikTokPostMedia videoSrc={videoUrl} thumbnailSrc={thumbnailUrl} />
  <TikTokPostUI
    username="creatorhub"
    avatarSrc={avatarUrl}
    caption="Behind the scenes 🎬"
  />
</TikTokPost>`,
  },
  youtube: {
    blurb:
      "YouTube has two surfaces: the landscape video (watch) page (16:9 player · title · channel · description · actions) and the vertical Short. Strictly-primitive: the YouTubeVideo shell + player, plus the YouTubeShort frame with its media + UI layers. There's no API flag for which is which — SocialPostPreview picks by the cover's orientation, just like the real product.",
    hierarchy: `YouTubeVideo
└── YouTubeVideoMedia

YouTubeShort
├── YouTubeShortMedia
└── YouTubeShortUI`,
    primitives: [
      bare(
        "YouTubeVideo",
        "The landscape video (watch) page shell — black bar · player slot · title · channel · description · actions · subscribe. Drop the player inside; title/description split from the caption.",
      ),
      bare(
        "YouTubeVideoMedia",
        "The 16:9 player + play badge — flat imageSrc / videoSrc / thumbnailSrc.",
      ),
      bare(
        "YouTubeShort",
        "The Short frame — the relative 9:19.5 container; stack the media + UI inside.",
      ),
      bare(
        "YouTubeShortMedia",
        "The Short media fill + scrim — flat videoSrc / thumbnailSrc / imageSrc.",
      ),
      bare("YouTubeShortUI", "The Short overlay — right action rail + bottom-left meta."),
    ],
    compose: `import {
  YouTubeVideo,
  YouTubeVideoMedia,
  YouTubeShort,
  YouTubeShortMedia,
  YouTubeShortUI,
} from "@/ui/youtube-chrome";

// Video — the shell + the 16:9 player slot (title/description split from the caption):
<YouTubeVideo username="sundarpixel" caption={"Title line\\nDescription…"}>
  <YouTubeVideoMedia imageSrc={coverUrl} />
</YouTubeVideo>

// Short — the frame + stacked media/UI layers:
<YouTubeShort>
  <YouTubeShortMedia videoSrc={videoUrl} thumbnailSrc={thumbnailUrl} />
  <YouTubeShortUI username="sundarpixel" caption="behind the scenes 🎬" />
</YouTubeShort>`,
  },
  facebook: {
    blurb:
      "Facebook has three surfaces: the feed post (header · caption · media collage · Like/Comment/Share), the Reel, and the Story. Strictly-primitive: the FacebookPost feed shell + media slot, plus the FacebookReel / FacebookStory vertical frames with their media + UI layers.",
    hierarchy: `FacebookPost
└── FacebookPostMedia

FacebookReel
├── FacebookReelMedia
└── FacebookReelUI

FacebookStory
├── FacebookStoryMedia
└── FacebookStoryUI`,
    primitives: [
      bare(
        "FacebookPost",
        "The feed post shell — header (name · time · audience) · caption · Like/Comment/Share bar. Drop the media slot inside.",
      ),
      bare(
        "FacebookPostMedia",
        "The edge-to-edge collage (1 full-width, 2–4 tiled, +N past four) — pass the full media array or flat imageSrc / videoSrc.",
      ),
      bare(
        "FacebookReel",
        "The Reel frame — the relative 9:19.5 container; stack the media + UI inside.",
      ),
      bare(
        "FacebookReelMedia",
        "The Reel media fill + scrim — flat videoSrc / thumbnailSrc / imageSrc.",
      ),
      bare("FacebookReelUI", "The Reel overlay — right action rail + bottom-left meta."),
      bare(
        "FacebookStory",
        "The Story frame — the relative 9:19.5 container; stack the media + UI inside.",
      ),
      bare(
        "FacebookStoryMedia",
        "The Story media fill + scrim — flat videoSrc / thumbnailSrc / imageSrc.",
      ),
      bare(
        "FacebookStoryUI",
        "The Story overlay — segmented progress + header + caption chip + send bar.",
      ),
    ],
    compose: `import {
  FacebookPost,
  FacebookPostMedia,
  FacebookReel,
  FacebookReelMedia,
  FacebookReelUI,
} from "@/ui/facebook-chrome";

// Feed — the shell + a media slot (the edge-to-edge collage):
<FacebookPost username="aperture" displayName="Aperture" avatarSrc={avatarUrl} caption="golden hour ✨">
  <FacebookPostMedia imageSrc={[photo1, photo2]} />
</FacebookPost>

// Reel — the frame + stacked media/UI layers (Story is the same shape):
<FacebookReel>
  <FacebookReelMedia videoSrc={videoUrl} thumbnailSrc={thumbnailUrl} />
  <FacebookReelUI username="aperture" caption="behind the scenes 🎬" />
</FacebookReel>`,
  },
  linkedin: {
    blurb:
      "The LinkedIn post — header with connection degree, caption, media, and the Like / Comment / Repost / Send bar. Strictly-primitive: the LinkedInPost shell + a media slot.",
    hierarchy: `LinkedInPost
└── LinkedInPostMedia`,
    primitives: [
      bare(
        "LinkedInPost",
        "The post shell — header (name · connection degree · time) · caption · Like/Comment/Repost/Send bar. Drop the media slot inside.",
      ),
      bare(
        "LinkedInPostMedia",
        "The edge-to-edge collage (1 full-width, 2–4 tiled, +N past four) — pass the full media array or flat imageSrc / videoSrc.",
      ),
    ],
    compose: `import {
  LinkedInPost,
  LinkedInPostMedia,
} from "@/ui/linkedin-chrome";

// The shell + a media slot (the edge-to-edge collage):
<LinkedInPost username="sundarpixel" displayName="Sundar" avatarSrc={avatarUrl} caption="Shipping all week ✨">
  <LinkedInPostMedia imageSrc={[photo1, photo2]} />
</LinkedInPost>`,
  },
  pinterest: {
    blurb:
      "The Pinterest pin — a single image in a rounded card, the action row with the red Save button, then the title and creator. Strictly-primitive: the PinterestPin shell + an image slot.",
    hierarchy: `PinterestPin
└── PinterestPinMedia`,
    primitives: [
      bare(
        "PinterestPin",
        "The pin shell — image slot (fills the top) · action row + Save · title · creator. Drop the image inside; the caption is the pin title.",
      ),
      bare(
        "PinterestPinMedia",
        "The rounded pin-image card — flat imageSrc / videoSrc / thumbnailSrc. Fills the pin's image region.",
      ),
    ],
    compose: `import {
  PinterestPin,
  PinterestPinMedia,
} from "@/ui/pinterest-chrome";

// The shell + the image slot (a pin is single-media; the caption is the title):
<PinterestPin username="pinner" avatarSrc={avatarUrl} caption="Weeknight pasta in 20 min">
  <PinterestPinMedia imageSrc={photo} />
</PinterestPin>`,
  },
  threads: {
    blurb:
      "The Threads post — avatar-left with a follow badge, verified handle, caption, rounded media, and the action row. Strictly-primitive: the ThreadsPost shell + a media slot.",
    hierarchy: `ThreadsPost
└── ThreadsPostMedia`,
    primitives: [
      bare(
        "ThreadsPost",
        "The post shell — avatar-left (follow +) · username · verified · time · caption · like/comment/repost/share row. Drop the media slot inside.",
      ),
      bare(
        "ThreadsPostMedia",
        "The rounded collage (1 full-width, 2–4 tiled, +N past four) — pass the full media array or flat imageSrc / videoSrc.",
      ),
    ],
    compose: `import {
  ThreadsPost,
  ThreadsPostMedia,
} from "@/ui/threads-chrome";

// The shell + a media slot (the rounded collage):
<ThreadsPost username="mosseri" avatarSrc={avatarUrl} caption="gm ✨">
  <ThreadsPostMedia imageSrc={[photo1, photo2]} />
</ThreadsPost>`,
  },
  bluesky: {
    blurb:
      "The Bluesky post — avatar-left, name · handle · time, caption, rounded media, and the reply / repost / like / share row. Strictly-primitive: the BlueskyPost shell + a media slot.",
    hierarchy: `BlueskyPost
└── BlueskyPostMedia`,
    primitives: [
      bare(
        "BlueskyPost",
        "The post shell — avatar-left · name · verified · handle · time · caption · reply/repost/like/share row. Drop the media slot inside.",
      ),
      bare(
        "BlueskyPostMedia",
        "The rounded collage (1 full-width, 2–4 tiled, +N past four) — pass the full media array or flat imageSrc / videoSrc.",
      ),
    ],
    compose: `import {
  BlueskyPost,
  BlueskyPostMedia,
} from "@/ui/bluesky-chrome";

// The shell + a media slot (the rounded collage):
<BlueskyPost username="jay.bsky.team" displayName="Jay" avatarSrc={avatarUrl} caption="gm ✨">
  <BlueskyPostMedia imageSrc={[photo1, photo2]} />
</BlueskyPost>`,
  },
};

/** A compact list of a platform's exported primitives. */
export function PlatformPrimitivesTable({
  primitives,
}: {
  primitives: PlatformPrimitive[];
}) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      {primitives.map((primitive) => (
        <div
          key={primitive.name}
          className="flex flex-col gap-0.5 p-3 sm:flex-row sm:items-baseline sm:gap-4"
        >
          <code className="shrink-0 font-mono text-xs font-medium sm:w-64">
            {primitive.name}
          </code>
          <span className="text-sm text-muted-foreground">
            {primitive.note}
          </span>
        </div>
      ))}
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router";

import {
  SocialPostPreview,
  type SocialPostPreviewInput,
} from "~/components/social-post-preview";
import type { SocialProvider } from "~/lib/post-for-me.types";
import { PLATFORM_LABELS } from "~/lib/post-for-me.utils";
import { cn } from "~/lib/utils";
import { BrandMark } from "~/ui/brand-mark";

import { CodeBlock } from "./code-block";
import {
  SAMPLE_LANDSCAPE_PHOTOS,
  SAMPLE_PHOTOS,
  SAMPLE_VERTICAL_PHOTOS,
  SAMPLE_VIDEO_THUMBS,
  sampleUser,
} from "./sample-content";

/**
 * SCAFFOLD — the breadth explorer answering "which social posts does this render?".
 *
 * Two tiers: **platform → a flat, curated set of representative renderings** (chrome +
 * variation collapsed on purpose — the reader shouldn't see that distinction here).
 * Ordered most → least popular for a creator/posting audience. The user toggles a
 * platform and sees that platform's renderings at a larger size. The grid is a
 * consistent 3 columns that wraps to the next row, so tiles stay the same size across
 * platforms regardless of count. Tiles are placeholders for now; each becomes a real
 * device + chrome as the chromes land.
 */
// A self-contained SVG-gradient data-URI keyed by the seed — a stable placeholder "photo"
// with NO network request, so the demo never shows broken images (external hosts like
// picsum break when the network / a blocker gets in the way).
/** Build a post's `social_account` from a sample user (avatar + name + handle). */
function sampleAccount(
  id: string,
  platform: string,
  handle: string,
): SocialPostPreviewInput["social_accounts"][number] {
  const user = sampleUser(handle);
  return {
    id,
    platform,
    username: user.handle,
    display_name: user.name,
    profile_photo_url: user.avatarUrl,
  };
}

/** A quoted post from a sample user — for quote-repost previews. */
function quoteOf(
  handle: string,
  caption: string,
  photo?: string | string[],
): NonNullable<SocialPostPreviewInput["quoted_post"]> {
  const user = sampleUser(handle);
  const photos = photo == null ? [] : Array.isArray(photo) ? photo : [photo];
  return {
    username: user.handle,
    display_name: user.name,
    profile_photo_url: user.avatarUrl,
    caption,
    media: photos.length ? photos.map((url) => ({ url })) : null,
  };
}

/**
 * One rendering tile in the breadth wall. A `post` present → render the REAL chrome; a
 * bare label → a "coming soon" placeholder. This lets a platform mix built + unbuilt
 * surfaces (e.g. Instagram: Feed + Carousel live, Reel + Story pending).
 */
type Rendering = { label: string; post?: SocialPostPreviewInput };

/** A sample X post for one rendering variation — used to render the real chrome live. */
function xSample(
  media: NonNullable<SocialPostPreviewInput["media"]>,
): SocialPostPreviewInput {
  return {
    caption: "Meet the new social post preview ✨",
    media,
    social_accounts: [sampleAccount("x-demo", "x", "elonmust")],
    platform_configurations: null,
    account_configurations: null,
  };
}

/** A sample Instagram post for one rendering variation. */
function igSample(
  handle: string,
  media: NonNullable<SocialPostPreviewInput["media"]>,
  caption = "Meet the new social post preview ✨",
): SocialPostPreviewInput {
  return {
    caption,
    media,
    social_accounts: [sampleAccount("ig-demo", "instagram", handle)],
    platform_configurations: null,
    account_configurations: null,
  };
}

/**
 * A sample Instagram post pinned to a vertical placement (reels / stories) via
 * `platform_configurations` — the same signal the resolver reads to pick the surface.
 */
function igPlacementSample(
  handle: string,
  placement: "reels" | "stories",
  caption: string,
  cover: string,
): SocialPostPreviewInput {
  return {
    caption,
    media: [{ url: "https://cdn.example.com/reel.mp4", thumbnail_url: cover }],
    social_accounts: [sampleAccount("ig-demo", "instagram", handle)],
    platform_configurations: { instagram: { placement } },
    account_configurations: null,
  };
}

/** A generic sample post for any platform, with an optional vertical placement. */
function sample(
  platform: string,
  handle: string,
  caption: string,
  media: NonNullable<SocialPostPreviewInput["media"]>,
  placement?: "reels" | "stories",
): SocialPostPreviewInput {
  return {
    caption,
    media,
    social_accounts: [sampleAccount(`${platform}-demo`, platform, handle)],
    platform_configurations: placement
      ? ({
          [platform]: { placement },
        } as NonNullable<SocialPostPreviewInput["platform_configurations"]>)
      : null,
    account_configurations: null,
  };
}

/** A vertical video sample (portrait cover) — TikTok / reels / shorts / stories. */
function verticalSample(
  platform: string,
  handle: string,
  caption: string,
  cover: string,
  placement?: "reels" | "stories",
): SocialPostPreviewInput {
  return sample(
    platform,
    handle,
    caption,
    [{ url: "https://cdn.example.com/clip.mp4", thumbnail_url: cover }],
    placement,
  );
}

// X is built, so its tiles render the REAL chrome (one sample post per variation).
const X_RENDERINGS: Rendering[] = [
  { label: "Text", post: xSample([]) },
  {
    label: "Repost",
    post: {
      ...xSample([]),
      caption: "This changes everything 🤯",
      quoted_post: quoteOf("johnapple", "Meet the new social post preview ✨", [
        SAMPLE_PHOTOS[2]!,
        SAMPLE_PHOTOS[3]!,
      ]),
    },
  },
  { label: "Photo", post: xSample([{ url: SAMPLE_PHOTOS[0]! }]) },
  {
    label: "Photo grid",
    post: xSample([
      { url: SAMPLE_PHOTOS[0]! },
      { url: SAMPLE_PHOTOS[1]! },
      { url: SAMPLE_PHOTOS[2]! },
      { url: SAMPLE_PHOTOS[3]! },
    ]),
  },
  {
    label: "Video",
    post: xSample([
      {
        url: "https://cdn.example.com/clip.mp4",
        thumbnail_url: SAMPLE_VIDEO_THUMBS[0]!,
      },
    ]),
  },
];

// Instagram feed chrome is built — Feed + Carousel render live; Reel + Story are pending
// their own surface chromes, so they stay as placeholders for now.
const IG_RENDERINGS: Rendering[] = [
  {
    label: "Feed",
    post: igSample("sundarpixel", [{ url: SAMPLE_PHOTOS[3]! }]),
  },
  {
    label: "Carousel",
    post: igSample(
      "johnapple",
      [
        { url: SAMPLE_PHOTOS[0]! },
        { url: SAMPLE_PHOTOS[1]! },
        { url: SAMPLE_PHOTOS[2]! },
      ],
      "Swipe through the new preview ✨",
    ),
  },
  {
    label: "Reel",
    post: igPlacementSample(
      "sundarpixel",
      "reels",
      "Golden hour on the trail 🎬✨",
      SAMPLE_PHOTOS[5]!,
    ),
  },
  {
    label: "Story",
    // A story with several media → the preview rotates through them (one story each), with a
    // segmented progress bar, tap-to-advance, and the next-story hint.
    post: {
      caption: "Shipping all week ✨",
      media: SAMPLE_VERTICAL_PHOTOS.map((url) => ({ url })),
      social_accounts: [sampleAccount("ig-demo", "instagram", "johnapple")],
      platform_configurations: { instagram: { placement: "stories" } },
      account_configurations: null,
    },
  },
];

const TIKTOK_RENDERINGS: Rendering[] = [
  {
    label: "Video",
    post: verticalSample(
      "tiktok",
      "faceberg",
      "Smash burger garlic bread sliders that disappeared in minutes 🍔😆",
      SAMPLE_VERTICAL_PHOTOS[1]!,
    ),
  },
];

const YOUTUBE_RENDERINGS: Rendering[] = [
  {
    label: "Video",
    post: sample(
      "youtube",
      "johnapple",
      "VFX Artists React to Great CGI 234\n\nWe break down the best and worst visual effects from this week's biggest releases — and what makes them work.",
      [
        {
          url: "https://cdn.example.com/clip.mp4",
          thumbnail_url: SAMPLE_LANDSCAPE_PHOTOS[1]!,
        },
      ],
    ),
  },
  {
    label: "Short",
    post: verticalSample(
      "youtube",
      "elonmust",
      "Everyone needs to see this 🎬 #shorts",
      SAMPLE_VERTICAL_PHOTOS[2]!,
    ),
  },
];

const FACEBOOK_RENDERINGS: Rendering[] = [
  {
    label: "Feed",
    post: sample(
      "facebook",
      "bezless",
      "What a blessing to visit Jamaica this week 🌴 A good reminder to slow down and plan to have no plans.",
      [
        { url: SAMPLE_PHOTOS[0]! },
        { url: SAMPLE_PHOTOS[1]! },
        { url: SAMPLE_PHOTOS[2]! },
        { url: SAMPLE_PHOTOS[4]! },
      ],
    ),
  },
  {
    label: "Reel",
    post: verticalSample(
      "facebook",
      "faceberg",
      "Caught on camera 📹",
      SAMPLE_VERTICAL_PHOTOS[0]!,
      "reels",
    ),
  },
  {
    label: "Story",
    // A story with several media → the preview rotates through them (one story each), with a
    // segmented progress bar, tap-to-advance, and the next-story hint.
    post: {
      caption: "You got this 💪",
      media: SAMPLE_VERTICAL_PHOTOS.map((url) => ({ url })),
      social_accounts: [sampleAccount("fb-demo", "facebook", "nutella")],
      platform_configurations: { facebook: { placement: "stories" } },
      account_configurations: null,
    },
  },
];

const LINKEDIN_RENDERINGS: Rendering[] = [
  {
    label: "Post",
    post: sample(
      "linkedin",
      "sundarpixel",
      "I'm excited to share something I've been building in the margins for months. It started as a small idea and grew into something I use every day.",
      [{ url: SAMPLE_PHOTOS[3]! }],
    ),
  },
];

const PINTEREST_RENDERINGS: Rendering[] = [
  {
    label: "Pin",
    post: sample("pinterest", "johnapple", "Surfing at golden hour 🏄✨", [
      { url: SAMPLE_VERTICAL_PHOTOS[2]! },
    ]),
  },
];

const THREADS_RENDERINGS: Rendering[] = [
  {
    label: "Text",
    post: sample(
      "threads",
      "elonmust",
      "Anyone building their startup completely in public? Curious how it's going.",
      [],
    ),
  },
  {
    label: "Photo",
    post: sample(
      "threads",
      "faceberg",
      "A cool little detail in the new suit design that everyone missed.",
      [{ url: SAMPLE_PHOTOS[1]! }, { url: SAMPLE_PHOTOS[2]! }],
    ),
  },
];

const BLUESKY_RENDERINGS: Rendering[] = [
  {
    label: "Text",
    post: sample(
      "bluesky",
      "johnapple",
      "For the latest conversation, we had a delightfully wide-ranging talk about a desire to make better mistakes.",
      [],
    ),
  },
  {
    label: "Photo",
    post: sample("bluesky", "sundarpixel", "Nothing is ever over ✨", [
      { url: SAMPLE_PHOTOS[4]! },
    ]),
  },
];

const BREADTH: { platform: SocialProvider; renderings: Rendering[] }[] = [
  { platform: "tiktok", renderings: TIKTOK_RENDERINGS },
  { platform: "instagram", renderings: IG_RENDERINGS },
  { platform: "youtube", renderings: YOUTUBE_RENDERINGS },
  { platform: "x", renderings: X_RENDERINGS },
  { platform: "facebook", renderings: FACEBOOK_RENDERINGS },
  { platform: "linkedin", renderings: LINKEDIN_RENDERINGS },
  { platform: "pinterest", renderings: PINTEREST_RENDERINGS },
  { platform: "threads", renderings: THREADS_RENDERINGS },
  { platform: "bluesky", renderings: BLUESKY_RENDERINGS },
];

/** The list of platforms with dedicated per-platform docs pages, in breadth-wall order. */
export const PREVIEW_PLATFORMS: SocialProvider[] = BREADTH.map((e) => e.platform);

/**
 * A grid of platform cards linking to each per-platform docs page — the parent page's
 * "which platforms" answer, kept compact so the parent stays focused on the auto-renderer.
 */
export function SocialPostPreviewPlatformLinks() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {PREVIEW_PLATFORMS.map((platform) => (
        <Link
          key={platform}
          to={`/docs/social-post-preview-${platform}`}
          className="flex items-center gap-2.5 rounded-lg border border-border p-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          <BrandMark platform={platform} className="size-5 shrink-0" />
          {PLATFORM_LABELS[platform]}
        </Link>
      ))}
    </div>
  );
}

/** A platform's curated renderings (one tile per surface/variation) — reused by the per-platform docs. */
export function PlatformRenderings({
  platform,
  className,
}: {
  platform: SocialProvider;
  className?: string;
}) {
  const entry = BREADTH.find((e) => e.platform === platform);
  if (!entry) return null;
  return (
    <div className={cn("grid grid-cols-3 items-start gap-4", className)}>
      {entry.renderings.map(({ label, post }) => (
        <div key={label} className="space-y-1.5">
          {post ? (
            <SocialPostPreview post={post} />
          ) : (
            <div className="grid aspect-[9/19.5] w-full place-items-center rounded-[1.75rem] border border-dashed border-border bg-muted/40 p-3 text-center">
              <span className="text-xs text-muted-foreground">Soon</span>
            </div>
          )}
          <p className="text-center text-xs text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}

/** The platform pill toggle, shared by the breadth wall and the cascade demo. */
function PlatformToggle<T extends string>({
  options,
  selected,
  onSelect,
  label,
}: {
  label: string;
  onSelect: (value: T) => void;
  options: { value: T; platform: SocialProvider; label: string }[];
  selected: T;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === selected;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-foreground bg-accent font-medium text-foreground"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <BrandMark platform={option.platform} className="size-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function SocialPostPreviewBreadthWall() {
  const [selected, setSelected] = useState<SocialProvider>(BREADTH[0]!.platform);

  return (
    <div className="space-y-6">
      <PlatformToggle
        label="Platform"
        selected={selected}
        onSelect={setSelected}
        options={BREADTH.map(({ platform }) => ({
          value: platform,
          platform,
          label: PLATFORM_LABELS[platform],
        }))}
      />

      {/* Consistent 3-col grid — real chrome where a surface is built, placeholder where not. */}
      <PlatformRenderings platform={selected} />
    </div>
  );
}

/**
 * SCAFFOLD — the configuration-cascade demo. A pre-configured post carries a base caption,
 * an Instagram PLATFORM override, and — on a SECOND Instagram account — an ACCOUNT
 * override, so the account-level selection row appears (two Instagram accounts render
 * differently). The real {@link SocialPostPreview} resolves the cascade and, in
 * `toggle` display, lets you switch to watch the effective caption change — shown beside
 * the post JSON that drives it, so the input and the rendered output sit side by side.
 */
// Short, glanceable captions — one per cascade layer — shared by the live post and the
// snippet so they can never drift.
const CASCADE_CAPTIONS = {
  post: "New drop 🎉",
  instagram: "New drop, on the grid 📸",
  instagramCollab: "New drop — collab with @maya 🤝",
};

const CASCADE_POST: SocialPostPreviewInput = {
  caption: CASCADE_CAPTIONS.post,
  media: [{ url: SAMPLE_PHOTOS[4]! }],
  // Two Instagram accounts: one takes the platform caption, the other an account override
  // — so the account-level row appears. X and TikTok each have one account (post caption).
  social_accounts: [
    sampleAccount("ig-john", "instagram", "johnapple"),
    sampleAccount("ig-sundar", "instagram", "sundarpixel"),
    sampleAccount("x-elon", "x", "elonmust"),
    sampleAccount("tt-mark", "tiktok", "faceberg"),
  ],
  platform_configurations: {
    instagram: { caption: CASCADE_CAPTIONS.instagram },
  },
  account_configurations: [
    {
      social_account_id: "ig-sundar",
      configuration: { caption: CASCADE_CAPTIONS.instagramCollab },
    },
  ],
};

// Only the cascade-relevant bits: media / social_accounts are elided so the eye stays on
// the caption overriding down the layers (post ▸ platform ▸ account).
const CASCADE_SNIPPET = `{
  "caption": "${CASCADE_CAPTIONS.post}",
  "media": [ ... ],
  "social_accounts": [ ... ],
  "platform_configurations": {
    "instagram": {
      "caption": "${CASCADE_CAPTIONS.instagram}"
    }
  },
  "account_configurations": [
    {
      "social_account_id": "ig-sundar",
      "configuration": {
        "caption": "${CASCADE_CAPTIONS.instagramCollab}"
      }
    }
  ]
}`;

export function SocialPostPreviewCascadeFigure() {
  return (
    <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-5">
      {/* left — the live auto-renderer; multiple accounts, so `auto` includes the switcher
          on its own (2 of 5 cols) */}
      <SocialPostPreview post={CASCADE_POST} className="sm:col-span-2" />

      {/* right — the post object it's rendering (3 of 5 cols) */}
      <CodeBlock lang="json" className="sm:col-span-3">
        {CASCADE_SNIPPET}
      </CodeBlock>
    </div>
  );
}

/**
 * Enrichment on vs. off. Post for Me stores some fields as bare IDs — a post's
 * `social_accounts` are account ids, an X repost's `quote_tweet_id` is one string. Passed
 * raw, each renders a dummy-filled PLACEHOLDER; enrich by hand with the full object and the
 * preview fills in for real. Here the SAME repost is rendered with the quoted post as a raw
 * id (left) vs. the enriched object (right) — only the embedded quote card changes.
 */
// The SAME X repost, with every enrichable area (the poster's account + the quoted tweet)
// passed as bare references (→ skeletons) vs. the full objects (→ real content).
const ENRICH_CAPTION = "This changes everything 🤯";

export function SocialPostPreviewEnrichmentFigure() {
  const referenceOnly: SocialPostPreviewInput = {
    caption: ENRICH_CAPTION,
    media: [],
    social_accounts: [{ id: "x1", platform: "x" }],
    quoted_post: "1895000000000000000",
    platform_configurations: null,
    account_configurations: null,
  };
  const enriched: SocialPostPreviewInput = {
    caption: ENRICH_CAPTION,
    media: [],
    social_accounts: [sampleAccount("x1", "x", "elonmust")],
    quoted_post: quoteOf(
      "johnapple",
      "Meet the new social post preview ✨",
      SAMPLE_PHOTOS[2],
    ),
    platform_configurations: null,
    account_configurations: null,
  };
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <EnrichmentColumn
        label="Reference only"
        note={`account { id, platform } · quoted_post "1895…"`}
        post={referenceOnly}
      />
      <EnrichmentColumn
        label="Enriched by hand"
        note="full account object · full quoted post object"
        post={enriched}
      />
    </div>
  );
}

function EnrichmentColumn({
  label,
  note,
  post,
}: {
  label: string;
  note: string;
  post: SocialPostPreviewInput;
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <code className="block truncate text-xs text-muted-foreground">
          {note}
        </code>
      </div>
      <SocialPostPreview post={post} />
    </div>
  );
}

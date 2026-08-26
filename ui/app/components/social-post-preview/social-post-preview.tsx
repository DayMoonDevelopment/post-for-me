"use client";

import type { ComponentProps } from "react";
import { useEffect, useState } from "react";

import { useSocialPostPreview } from "~/hooks/use-social-post-preview";
import { UserAvatar, UserAvatarBadge } from "~/components/user-avatar";
import { cn } from "~/lib/utils";
import { BrandMark } from "~/ui/brand-mark";
import { IconPlaceholder } from "~/ui/icon-placeholder";
import { Skeleton } from "~/ui/skeleton";
import { Toggle } from "~/ui/toggle";

import { SocialPostPreviewDevice } from "./social-post-preview-device";
import {
  SocialPostPreviewFrameProvider,
  useSocialPostPreviewFrame,
} from "./social-post-preview-context";
import { SocialPostPreviewFeed } from "./social-post-preview-feed-skeleton";
import { SocialPostPreviewMediaItem } from "./social-post-preview-media";
import { StoryRotator } from "./social-post-preview-story";
import type { SocialPostPreviewView } from "~/lib/social-post-preview-resolver";
import type {
  SocialPostPreviewDescriptor,
  SocialPostPreviewInput,
  SocialPostPreviewMedia,
} from "~/lib/social-post-preview-types";

import {
  TikTokPost,
  TikTokPostMedia,
  TikTokPostUI,
} from "~/ui/tiktok-chrome";
import { XPost, XPostMedia, XPostQuote } from "~/ui/x-chrome";
import {
  InstagramPost,
  InstagramPostMedia,
  InstagramReel,
  InstagramReelMedia,
  InstagramReelUI,
  InstagramStory,
  InstagramStoryMedia,
  InstagramStoryUI,
} from "~/ui/instagram-chrome";
import {
  FacebookPost,
  FacebookPostMedia,
  FacebookReel,
  FacebookReelMedia,
  FacebookReelUI,
  FacebookStory,
  FacebookStoryMedia,
  FacebookStoryUI,
} from "~/ui/facebook-chrome";
import {
  YouTubeShort,
  YouTubeShortMedia,
  YouTubeShortUI,
  YouTubeVideo,
  YouTubeVideoMedia,
} from "~/ui/youtube-chrome";
import { LinkedInPost, LinkedInPostMedia } from "~/ui/linkedin-chrome";
import { PinterestPin, PinterestPinMedia } from "~/ui/pinterest-chrome";
import { ThreadsPost, ThreadsPostMedia } from "~/ui/threads-chrome";
import { BlueskyPost, BlueskyPostMedia } from "~/ui/bluesky-chrome";

// ── The auto-renderer + its dispatcher — the full integration: hook (materialize + resolve),
// the config cascade, the device frame, the feed context, and the per-platform mapping. The
// raw building blocks live in the sibling `social-post-preview-*` files (device, context,
// feed, media) and in `~/ui/<platform>-chrome`; this file wires them together.

// The timeline platforms whose bare post the renderer drops into the shared feed context
// (a masked run of skeleton posts) so the device reads like a real feed. Full-bleed surfaces
// (reel / story / video), plus YouTube and Pinterest, render their bare chrome directly.
const FEED_CONTEXT_PLATFORMS = new Set([
  "x",
  "instagram",
  "facebook",
  "linkedin",
  "threads",
  "bluesky",
]);
function needsFeedContext(descriptor: SocialPostPreviewDescriptor): boolean {
  return (
    !descriptor.placeholder &&
    !!descriptor.platform &&
    FEED_CONTEXT_PLATFORMS.has(descriptor.platform) &&
    descriptor.surface === "feed"
  );
}

/** A device with the current frame's chrome inside — wrapped in the feed context if it's a feed. */
function SocialPostPreviewFramedDevice({
  descriptor,
}: {
  descriptor: SocialPostPreviewDescriptor;
}) {
  return (
    <SocialPostPreviewFrameProvider descriptor={descriptor}>
      <SocialPostPreviewDevice>
        {needsFeedContext(descriptor) ? (
          <SocialPostPreviewFeed>
            <SocialPostPreviewChrome />
          </SocialPostPreviewFeed>
        ) : (
          <SocialPostPreviewChrome />
        )}
      </SocialPostPreviewDevice>
    </SocialPostPreviewFrameProvider>
  );
}

/**
 * The opinionated, Post-for-Me-native entry point — the **model citizen** for previewing
 * a social post. Hand it a PFM {@link SocialPostPreviewInput} (a real `SocialPost` works
 * as-is) and it does everything: applies the full configuration cascade per account, then
 * renders each targeted account's frame. This is the full integration; to take control, drop
 * to the per-platform chrome primitives in `~/ui/<platform>-chrome`.
 *
 * Three displays:
 * - `"auto"` (default) — **decides for you**: with more than one distinct preview it shows one
 *   frame plus a **switcher** (a row of platform-default renderings + a row of account
 *   overrides); with a single option it shows just that one frame, no switcher.
 * - `"toggle"` — always the single-frame + switcher UI.
 * - `"grid"` — fans out every targeted account frame at once, no switcher.
 */
export function SocialPostPreview({
  post,
  display = "auto",
  className,
  ...props
}: {
  post: SocialPostPreviewInput;
  display?: "auto" | "grid" | "toggle";
} & Omit<ComponentProps<"div">, "children">) {
  // The headless engine: materializes local files → object URLs and resolves the config
  // cascade into descriptors + the distinct views.
  const { descriptors, views } = useSocialPostPreview(post);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  // "grid" fans out every account frame side by side.
  if (display === "grid") {
    return (
      <div
        data-slot="social-post-preview"
        data-display="grid"
        className={cn(
          "grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] items-start gap-4",
          className,
        )}
        {...props}
      >
        {descriptors.map((descriptor) => (
          <SocialPostPreviewFramedDevice
            key={descriptor.id}
            descriptor={descriptor}
          />
        ))}
      </div>
    );
  }

  // The switcher appears whenever there's more than one distinct preview — automatically in
  // "auto", always in "toggle".
  const showSwitcher = display === "toggle" || views.length > 1;

  if (showSwitcher) {
    const activeView =
      views.find((view) => view.key === activeKey) ?? views[0] ?? null;
    const platformViews = views.filter((view) => view.kind === "platform");
    const accountViews = views.filter((view) => view.kind === "account");

    return (
      <div
        data-slot="social-post-preview"
        data-display="toggle"
        className={cn("space-y-2", className)}
        {...props}
      >
        {activeView ? (
          <div className="mx-auto w-full max-w-56">
            <SocialPostPreviewFramedDevice descriptor={activeView.descriptor} />
          </div>
        ) : null}

        {/* Rows UNDER the preview — row 1: platform-default views, row 2: overrides. */}
        <div className="space-y-1">
          <ViewToggleRow
            label="Platforms"
            views={platformViews}
            activeKey={activeView?.key}
            onSelect={setActiveKey}
          />
          {accountViews.length ? (
            <ViewToggleRow
              label="Account overrides"
              views={accountViews}
              activeKey={activeView?.key}
              onSelect={setActiveKey}
            />
          ) : null}
        </div>
      </div>
    );
  }

  // "auto" with a single distinct preview — just the one framed device, no switcher.
  const only = views[0] ?? null;
  return (
    <div
      data-slot="social-post-preview"
      data-display="single"
      className={cn(className)}
      {...props}
    >
      {only ? (
        <SocialPostPreviewFramedDevice descriptor={only.descriptor} />
      ) : null}
    </div>
  );
}

/** One row of view chips (a platform row or an account-override row). */
function ViewToggleRow({
  label,
  views,
  activeKey,
  onSelect,
}: {
  activeKey?: string;
  label: string;
  onSelect: (key: string) => void;
  views: SocialPostPreviewView[];
}) {
  if (!views.length) return null;
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap justify-center gap-1"
    >
      {views.map((view) => (
        <Toggle
          key={view.key}
          pressed={view.key === activeKey}
          onPressedChange={() => onSelect(view.key)}
          aria-label={view.label}
          // Fixed square across every chip — only the inner content size varies.
          className="size-[34px] p-0"
        >
          {view.kind === "account" ? (
            // Account view: the user avatar with the platform brand mark notched on it.
            <UserAvatar
              name={view.descriptor.account.username}
              src={view.descriptor.account.avatarUrl}
              size="sm"
              className="size-[32px] [&_[data-slot=avatar-fallback]]:text-[0.5rem]! [&_[data-slot=avatar-fallback]]:leading-none!"
            >
              {/* A bordered disc (not a knockout) so the mark reads on the transparent
                  chip even where it straddles off the avatar. The explicit brand-mark
                  size opts it out of the Toggle's [&_svg]:size-4 auto-sizing. */}
              {view.platform ? (
                <UserAvatarBadge className="[&>*]:ring-0">
                  <span className="flex size-3 items-center justify-center rounded-full border border-border bg-background">
                    <BrandMark platform={view.platform} className="size-2" />
                  </span>
                </UserAvatarBadge>
              ) : null}
            </UserAvatar>
          ) : view.platform ? (
            // Platform view: the platform brand mark only.
            <BrandMark platform={view.platform} className="size-5" />
          ) : (
            // Placeholder view (bare-id account): a generic user glyph, no platform mark.
            <IconPlaceholder
              lucide="User"
              tabler="IconUser"
              phosphor="User"
              hugeicons="UserIcon"
              remixicon="RiUserLine"
              className="size-5 text-muted-foreground"
              aria-hidden
            />
          )}
        </Toggle>
      ))}
    </div>
  );
}

/**
 * The smart chrome dispatcher — internal machinery of {@link SocialPostPreview}. Resolves the
 * frame's `(platform, surface)` and maps the resolved descriptor onto that surface's primitives
 * (e.g. `TikTokPost` + `TikTokPostMedia` + `TikTokPostUI`). Reads the current frame from context
 * (as SocialPostPreview provides it) or takes an explicit `descriptor`. This is the ONLY place a
 * post is auto-mapped onto primitives — the per-surface primitives themselves are pure.
 */
export function SocialPostPreviewChrome({
  descriptor: descriptorProp,
}: {
  /** Render this frame explicitly instead of reading the current frame context. */
  descriptor?: SocialPostPreviewDescriptor;
}) {
  const frame = useSocialPostPreviewFrame();
  const descriptor = descriptorProp ?? frame;
  if (!descriptor) return null;

  // A placeholder frame (an account passed as a bare id — platform unknown) gets a neutral
  // card, not a platform chrome.
  if (descriptor.placeholder) {
    return <SocialPostPreviewChromePlaceholder descriptor={descriptor} />;
  }

  switch (descriptor.platform) {
    case "x": {
      const { account, caption, media, quote } = descriptor;
      return (
        <XPost
          username={account.username}
          displayName={account.displayName ?? undefined}
          avatarSrc={account.avatarUrl ?? undefined}
          caption={caption}
        >
          {media.length > 0 ? <XPostMedia media={media} /> : null}
          {quote ? (
            quote.placeholder ? (
              <XPostQuote placeholder />
            ) : (
              <XPostQuote
                username={quote.username}
                displayName={quote.displayName}
                avatarSrc={quote.avatarUrl}
                caption={quote.caption}
                media={quote.media}
              />
            )
          ) : null}
        </XPost>
      );
    }
    case "tiktok":
    case "tiktok_business": {
      const media = descriptor.media[0];
      return (
        <TikTokPost>
          <TikTokPostMedia
            imageSrc={media?.kind === "image" ? media.src : undefined}
            videoSrc={media?.kind === "video" ? media.videoSrc : undefined}
            thumbnailSrc={media?.kind === "video" ? media.src : undefined}
          />
          <TikTokPostUI
            username={descriptor.account.username}
            displayName={descriptor.account.displayName ?? undefined}
            avatarSrc={descriptor.account.avatarUrl ?? undefined}
            caption={descriptor.caption}
          />
        </TikTokPost>
      );
    }
    case "instagram": {
      const { account, caption, media } = descriptor;
      if (descriptor.surface === "reel") {
        const m = media[0];
        return (
          <InstagramReel>
            <InstagramReelMedia
              imageSrc={m?.kind === "image" ? m.src : undefined}
              videoSrc={m?.kind === "video" ? m.videoSrc : undefined}
              thumbnailSrc={m?.kind === "video" ? m.src : undefined}
            />
            <InstagramReelUI
              username={account.username}
              displayName={account.displayName ?? undefined}
              avatarSrc={account.avatarUrl ?? undefined}
              caption={caption}
            />
          </InstagramReel>
        );
      }
      if (descriptor.surface === "story") {
        // A story can carry several media — rotate through them (segmented progress + tap).
        return (
          <StoryRotator
            frame={InstagramStory}
            mediaLayer={InstagramStoryMedia}
            ui={InstagramStoryUI}
            items={media}
            username={account.username}
            displayName={account.displayName ?? undefined}
            avatarSrc={account.avatarUrl ?? undefined}
            caption={caption}
          />
        );
      }
      return (
        <InstagramPost
          username={account.username}
          displayName={account.displayName ?? undefined}
          avatarSrc={account.avatarUrl ?? undefined}
          caption={caption}
        >
          {media.length > 0 ? <InstagramPostMedia media={media} /> : null}
        </InstagramPost>
      );
    }
    case "facebook": {
      const { account, caption, media } = descriptor;
      if (descriptor.surface === "reel") {
        const m = media[0];
        return (
          <FacebookReel>
            <FacebookReelMedia
              imageSrc={m?.kind === "image" ? m.src : undefined}
              videoSrc={m?.kind === "video" ? m.videoSrc : undefined}
              thumbnailSrc={m?.kind === "video" ? m.src : undefined}
            />
            <FacebookReelUI
              username={account.username}
              displayName={account.displayName ?? undefined}
              avatarSrc={account.avatarUrl ?? undefined}
              caption={caption}
            />
          </FacebookReel>
        );
      }
      if (descriptor.surface === "story") {
        // A story can carry several media — rotate through them (segmented progress + tap).
        return (
          <StoryRotator
            frame={FacebookStory}
            mediaLayer={FacebookStoryMedia}
            ui={FacebookStoryUI}
            items={media}
            username={account.username}
            displayName={account.displayName ?? undefined}
            avatarSrc={account.avatarUrl ?? undefined}
            caption={caption}
          />
        );
      }
      return (
        <FacebookPost
          username={account.username}
          displayName={account.displayName ?? undefined}
          avatarSrc={account.avatarUrl ?? undefined}
          caption={caption}
        >
          {media.length > 0 ? <FacebookPostMedia media={media} /> : null}
        </FacebookPost>
      );
    }
    case "youtube":
      // Video vs. Short is sniffed from the cover's orientation (YouTube has no API flag).
      return <YouTubeChrome descriptor={descriptor} />;
    case "linkedin": {
      const { account, caption, media } = descriptor;
      return (
        <LinkedInPost
          username={account.username}
          displayName={account.displayName ?? undefined}
          avatarSrc={account.avatarUrl ?? undefined}
          caption={caption}
        >
          {media.length > 0 ? <LinkedInPostMedia media={media} /> : null}
        </LinkedInPost>
      );
    }
    case "pinterest": {
      const { account, caption, media } = descriptor;
      const cover = media[0];
      return (
        <PinterestPin
          username={account.username}
          displayName={account.displayName ?? undefined}
          avatarSrc={account.avatarUrl ?? undefined}
          caption={caption}
        >
          <PinterestPinMedia
            imageSrc={cover?.kind === "image" ? cover.src : undefined}
            videoSrc={cover?.kind === "video" ? cover.videoSrc : undefined}
            thumbnailSrc={cover?.kind === "video" ? cover.src : undefined}
          />
        </PinterestPin>
      );
    }
    case "threads": {
      const { account, caption, media } = descriptor;
      return (
        <ThreadsPost
          username={account.username}
          displayName={account.displayName ?? undefined}
          avatarSrc={account.avatarUrl ?? undefined}
          caption={caption}
        >
          {media.length > 0 ? <ThreadsPostMedia media={media} /> : null}
        </ThreadsPost>
      );
    }
    case "bluesky": {
      const { account, caption, media } = descriptor;
      return (
        <BlueskyPost
          username={account.username}
          displayName={account.displayName ?? undefined}
          avatarSrc={account.avatarUrl ?? undefined}
          caption={caption}
        >
          {media.length > 0 ? <BlueskyPostMedia media={media} /> : null}
        </BlueskyPost>
      );
    }
    default:
      return <SocialPostPreviewChromeFallback descriptor={descriptor} />;
  }
}

/**
 * Sniff a cover's orientation on the client (portrait? → true). The natural size is read from a
 * throwaway `Image` / `<video>` — the same still the media item would show — so the caller needs
 * no measurement hook on the rendered primitive. Landscape until it loads; SSR-safe (the effect
 * is client-only). Keyed on the media's URLs so it re-measures when the cover changes.
 */
function useCoverIsPortrait(media?: SocialPostPreviewMedia): boolean {
  const [portrait, setPortrait] = useState(false);
  const still = media?.src;
  const videoSrc = media?.kind === "video" ? media.videoSrc : undefined;

  useEffect(() => {
    let cancelled = false;
    const decide = (width: number, height: number) => {
      if (!cancelled && width && height) setPortrait(height > width);
    };
    // Poster still (image, or a video's thumbnail) → measure the image; a posterless video →
    // read its metadata. Mirrors how SocialPostPreviewMediaItem resolves the same media.
    if (still) {
      const img = new Image();
      img.onload = () => decide(img.naturalWidth, img.naturalHeight);
      img.src = still;
    } else if (videoSrc) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => decide(video.videoWidth, video.videoHeight);
      video.src = videoSrc;
    }
    return () => {
      cancelled = true;
    };
  }, [still, videoSrc]);

  return portrait;
}

/**
 * YouTube's surface picker — the API has no short/video flag, so (like the real product) the
 * mapping decides contextually: portrait cover → the vertical Short, else the landscape Video
 * (watch) page. The `YouTube*` primitives are unopinionated (either can be rendered at any time);
 * this mapper-layer component owns the orientation logic and measures the cover itself.
 */
function YouTubeChrome({
  descriptor,
}: {
  descriptor: SocialPostPreviewDescriptor;
}) {
  const { account, caption, media } = descriptor;
  const cover = media[0];
  const portrait = useCoverIsPortrait(cover);

  if (portrait) {
    return (
      <YouTubeShort>
        <YouTubeShortMedia
          imageSrc={cover?.kind === "image" ? cover.src : undefined}
          videoSrc={cover?.kind === "video" ? cover.videoSrc : undefined}
          thumbnailSrc={cover?.kind === "video" ? cover.src : undefined}
        />
        <YouTubeShortUI
          username={account.username}
          displayName={account.displayName ?? undefined}
          avatarSrc={account.avatarUrl ?? undefined}
          caption={caption}
        />
      </YouTubeShort>
    );
  }
  return (
    <YouTubeVideo
      username={account.username}
      displayName={account.displayName ?? undefined}
      avatarSrc={account.avatarUrl ?? undefined}
      caption={caption}
    >
      <YouTubeVideoMedia
        imageSrc={cover?.kind === "image" ? cover.src : undefined}
        videoSrc={cover?.kind === "video" ? cover.videoSrc : undefined}
        thumbnailSrc={cover?.kind === "video" ? cover.src : undefined}
      />
    </YouTubeVideo>
  );
}

/** A neutral placeholder for platforms/surfaces without a concrete chrome yet. */
function SocialPostPreviewChromeFallback({
  descriptor,
}: {
  descriptor: SocialPostPreviewDescriptor;
}) {
  return (
    <div
      data-slot="social-post-preview-chrome-fallback"
      data-surface={descriptor.surface}
      className="flex h-full flex-col items-center justify-center gap-[0.4em] bg-muted p-[0.9em] text-center leading-snug text-muted-foreground"
    >
      {descriptor.platform ? (
        <BrandMark platform={descriptor.platform} className="size-[2em]" />
      ) : null}
      <span className="font-medium">{descriptor.platform}</span>
      <span className="text-[0.8em]">
        {descriptor.surface} · preview coming soon
      </span>
    </div>
  );
}

/**
 * A neutral post card for a **placeholder** frame — an account handed in as a bare id, so
 * its platform is unknown. Identity is dummy-filled; we still show the post's caption and
 * media so the preview is useful. Pass the full account object to upgrade to the real chrome.
 */
function SocialPostPreviewChromePlaceholder({
  descriptor,
}: {
  descriptor: SocialPostPreviewDescriptor;
}) {
  const { caption, media } = descriptor;
  const cover = media[0];

  return (
    <div
      data-slot="social-post-preview-chrome-placeholder"
      data-surface="placeholder"
      className="flex h-full flex-col bg-background leading-snug"
    >
      {/* header — skeleton identity (a bare id string carries no name / avatar) */}
      <div className="flex items-center gap-[0.6em] p-[0.9em]">
        <Skeleton className="size-[2.4em] shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-col gap-[0.35em]">
          <Skeleton className="h-[0.85em] w-[7em] rounded-full" />
          <Skeleton className="h-[0.75em] w-[5em] rounded-full" />
        </div>
      </div>

      {/* caption */}
      {caption ? (
        <p className="px-[0.9em] pb-[0.7em] break-words whitespace-pre-wrap">
          {caption}
        </p>
      ) : null}

      {/* media */}
      {cover ? (
        <div className="relative aspect-square bg-muted">
          <SocialPostPreviewMediaItem media={cover} />
        </div>
      ) : null}
    </div>
  );
}

// ── Re-exports — the raw building blocks, for hand-composing without a second import path.
export { SocialPostPreviewDevice } from "./social-post-preview-device";
export { SocialPostPreviewFeed } from "./social-post-preview-feed-skeleton";
export { SocialPostPreviewMediaItem } from "./social-post-preview-media";
export {
  SocialPostPreviewFrameProvider,
  useSocialPostPreviewFrame,
} from "./social-post-preview-context";
export { useSocialPostPreview } from "~/hooks/use-social-post-preview";
export {
  resolveSocialPost,
  resolveSocialPostViews,
  type SocialPostPreviewView,
} from "~/lib/social-post-preview-resolver";
export type {
  SocialPostPreviewAccount,
  SocialPostPreviewAccountRef,
  SocialPostPreviewDescriptor,
  SocialPostPreviewDeviceKind,
  SocialPostPreviewFrameAccount,
  SocialPostPreviewInput,
  SocialPostPreviewMedia,
  SocialPostPreviewMediaInput,
  SocialPostPreviewQuoteRef,
  SocialPostPreviewSurface,
} from "~/lib/social-post-preview-types";

import type { ComponentProps } from "react";

import { useTranslation } from "react-i18next";

import type { SocialPostPreviewMedia } from "~/lib/social-post-preview-types";

import { FeedMediaGrid } from "~/components/social-post-preview/social-post-preview-feed-media";
import {
  flatMediaToItem,
  flatMediaToList,
  type SocialPostPreviewFlatMediaProps,
} from "~/components/social-post-preview/social-post-preview-flat-media";
import { SocialPostPreviewMediaItem } from "~/components/social-post-preview/social-post-preview-media";
import { UserAvatar } from "~/components/user-avatar";
import { BookmarkIcon, CloseIcon, CommentIcon, ForwardIcon, GlobeIcon, HeartIcon, MoreIcon, ShareIcon, ThumbUpIcon } from "~/icons";
import { cn } from "~/lib/utils";
import { Skeleton } from "~/ui/skeleton";

/**
 * The **FacebookPost** family — Facebook's three strictly-primitive surfaces: the feed post
 * ({@link FacebookPost} + {@link FacebookPostMedia}), the {@link FacebookReel}, and the
 * {@link FacebookStory} (each vertical frame with its own media + UI layers). These take raw
 * props / children only — no descriptor, no auto-mapping:
 *
 * ```tsx
 * <FacebookPost username="aperture" displayName="Aperture" avatarSrc={url} caption="gm">
 *   <FacebookPostMedia imageSrc={[a, b]} />
 * </FacebookPost>
 *
 * <FacebookReel>
 *   <FacebookReelMedia videoSrc={videoUrl} thumbnailSrc={thumbnailUrl} />
 *   <FacebookReelUI username="aperture" caption="behind the scenes 🎬" />
 * </FacebookReel>
 * ```
 *
 * To preview a whole Post for Me post, use {@link SocialPostPreview}, which maps the post onto
 * these primitives (and rotates a multi-media story) inside the shared feed context + device.
 * Sized in `em` off the device's `text-[4cqi]` base. An empty identity renders as a skeleton.
 */
export function FacebookPost({
  username,
  displayName,
  avatarSrc,
  caption,
  className,
  children,
  ...props
}: {
  avatarSrc?: string | null;
  caption?: string;
  displayName?: string | null;
  username?: string | null;
} & ComponentProps<"article">) {
  const name = displayName ?? username ?? "";
  const enriched = Boolean(username || displayName || avatarSrc);

  return (
    <article
      data-slot="facebook-post"
      data-surface="feed"
      className={cn(
        "flex flex-col bg-background py-[0.5em] leading-snug",
        className,
      )}
      {...props}
    >
      {/* header */}
      <div className="flex items-center gap-[0.6em] px-[0.9em] py-[0.4em]">
        {enriched ? (
          <UserAvatar
            name={name}
            src={avatarSrc ?? undefined}
            size="sm"
            className="size-[2.6em]"
          />
        ) : (
          <Skeleton className="size-[2.6em] shrink-0 rounded-full" />
        )}
        <div className="flex min-w-0 flex-col gap-[0.25em]">
          {enriched ? (
            <>
              <span className="truncate font-semibold">{name}</span>
              <span className="flex items-center gap-[0.3em] text-[0.8em] text-muted-foreground">
                just now ·
                <GlobeIcon className="size-[1em]"
                  aria-hidden />
              </span>
            </>
          ) : (
            <>
              <Skeleton className="h-[0.85em] w-[6em] rounded-full" />
              <Skeleton className="h-[0.8em] w-[4em] rounded-full" />
            </>
          )}
        </div>
        <MoreIcon className="ms-auto size-[1.3em] shrink-0 text-muted-foreground"
          aria-hidden />
      </div>

      {/* caption */}
      {caption ? (
        <p className="px-[0.9em] pb-[0.6em] break-words whitespace-pre-wrap">
          {caption}
        </p>
      ) : null}

      {/* media slot — drop <FacebookPostMedia> (or your own) here, edge to edge */}
      {children}

      {/* action bar */}
      <div className="mx-[0.9em] mt-[0.5em] flex items-center justify-around border-t border-border pt-[0.5em] text-[0.9em] font-medium text-muted-foreground [&_svg]:size-[1.15em]">
        <span className="flex items-center gap-[0.35em]">
          <ThumbUpIcon aria-hidden />
          Like
        </span>
        <span className="flex items-center gap-[0.35em]">
          <CommentIcon aria-hidden />
          Comment
        </span>
        <span className="flex items-center gap-[0.35em]">
          <ForwardIcon aria-hidden />
          Share
        </span>
      </div>
    </article>
  );
}

/**
 * The Facebook feed media layer — the edge-to-edge collage (1 full-width, 2–4 tiled, "+N" past
 * four). Pass the resolved `media` array (full fidelity) or flat props: `imageSrc` for photos
 * (one URL or an array), or `videoSrc` + `thumbnailSrc` for a clip.
 */
export function FacebookPostMedia({
  media: mediaProp,
  className,
  ...flat
}: {
  className?: string;
  media?: SocialPostPreviewMedia[];
} & SocialPostPreviewFlatMediaProps) {
  const items = mediaProp ?? flatMediaToList(flat);
  return <FeedMediaGrid media={items} className={className} />;
}

/**
 * The Facebook Reel **frame** — the relative, full-bleed 9:19.5 container the media + UI layers
 * stack inside. Compose {@link FacebookReelMedia} + {@link FacebookReelUI} (or your own overlays)
 * as children. The **`9/19.5` aspect is baked in** — reels are always vertical, so it renders
 * correctly even outside the device frame. Sized in `em` off the device's `text-[4cqi]` base.
 */
export function FacebookReel({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="facebook-reel"
      data-surface="reel"
      className={cn(
        "relative aspect-[9/19.5] w-full overflow-hidden bg-black text-white leading-snug",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * The Reel media layer — the cover fills the frame with a scrim for overlay legibility. Pass flat
 * props: `videoSrc` + `thumbnailSrc` for a clip, or `imageSrc` for a photo cover.
 */
export function FacebookReelMedia({
  className,
  ...media
}: SocialPostPreviewFlatMediaProps & { className?: string }) {
  return (
    <FacebookReelMediaFill media={flatMediaToItem(media)} className={className} />
  );
}

/** Internal fill shared by the composed chrome (full media object) and the flat layer above. */
function FacebookReelMediaFill({
  media,
  className,
}: {
  className?: string;
  media?: SocialPostPreviewMedia;
}) {
  return (
    <div className={cn("absolute inset-0 bg-black", className)}>
      {media ? (
        <SocialPostPreviewMediaItem
          media={media}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-black/25" />
    </div>
  );
}

/** The Reel UI layer — the right action rail and the bottom-left meta, overlaid on the media. */
export function FacebookReelUI({
  username,
  displayName,
  avatarSrc,
  caption,
  className,
}: {
  avatarSrc?: string;
  caption?: string;
  className?: string;
  displayName?: string;
  username?: string;
}) {
  const { t } = useTranslation();

  const name = displayName ?? username;
  // No identity yet (a bare { id, platform } account) → skeleton the avatar + name.
  const enriched = Boolean(username || displayName || avatarSrc);

  return (
    <div className={cn("absolute inset-0 text-white", className)}>
      {/* right action rail */}
      <div className="absolute end-[0.7em] bottom-[3em] flex flex-col items-center gap-[1.2em] drop-shadow [&_svg]:size-[1.6em]">
        <ThumbUpIcon aria-label={t("preview.actions.like")} />
        <CommentIcon aria-label={t("preview.actions.comment")} />
        <ShareIcon aria-label={t("preview.actions.share")} />
        <BookmarkIcon aria-label={t("preview.actions.save")} />
        <MoreIcon aria-label={t("preview.actions.more")} />
      </div>

      {/* bottom-left meta */}
      <div className="absolute inset-x-0 bottom-0 space-y-[0.45em] p-[0.9em] pe-[3.2em] pb-[3em]">
        <div className="flex items-center gap-[0.5em]">
          {enriched ? (
            <UserAvatar
              name={name}
              src={avatarSrc}
              size="sm"
              className="size-[2em] ring-1 ring-white/80"
            />
          ) : (
            <Skeleton className="size-[2em] rounded-full bg-white/30" />
          )}
          {enriched ? (
            <span className="truncate font-semibold">{name}</span>
          ) : (
            <Skeleton className="h-[0.85em] w-[6em] rounded-full bg-white/30" />
          )}
          <span className="rounded-[0.35em] border border-white/70 px-[0.5em] py-[0.1em] text-[0.8em] font-semibold">
            Follow
          </span>
        </div>
        {caption ? <p className="line-clamp-2 text-[0.92em]">{caption}</p> : null}
      </div>
    </div>
  );
}

/**
 * The Facebook Story **frame** — the relative, full-bleed 9:19.5 container the media + UI layers
 * stack inside. Compose {@link FacebookStoryMedia} + {@link FacebookStoryUI} (or your own
 * overlays) as children. The **`9/19.5` aspect is baked in** — stories are always vertical. To
 * rotate a multi-media story, {@link SocialPostPreview} drives these through the shared story
 * rotator. Sized in `em` off the device's `text-[4cqi]` base.
 */
export function FacebookStory({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="facebook-story"
      data-surface="story"
      className={cn(
        "relative aspect-[9/19.5] w-full overflow-hidden bg-black text-white leading-snug",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * The Story media layer — the cover fills the frame with a top+bottom scrim for legibility. Pass
 * flat props: `videoSrc` + `thumbnailSrc` for a clip, or `imageSrc` for a photo cover.
 */
export function FacebookStoryMedia({
  className,
  ...media
}: SocialPostPreviewFlatMediaProps & { className?: string }) {
  return (
    <FacebookStoryMediaFill
      media={flatMediaToItem(media)}
      className={className}
    />
  );
}

/** Internal fill shared by the composed chrome (full media object) and the flat layer above. */
function FacebookStoryMediaFill({
  media,
  className,
}: {
  className?: string;
  media?: SocialPostPreviewMedia;
}) {
  return (
    <div className={cn("absolute inset-0 bg-black", className)}>
      {media ? (
        <SocialPostPreviewMediaItem
          media={media}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/45" />
    </div>
  );
}

/**
 * The Story UI layer — the segmented progress bar (one filled segment per story up to
 * `activeIndex`), header, bottom caption chip, and send bar over the media. `count` / `activeIndex`
 * are fed by {@link SocialPostPreview}'s story rotator; hand-composed, they default to a single
 * full segment.
 */
export function FacebookStoryUI({
  username,
  displayName,
  avatarSrc,
  caption,
  count = 1,
  activeIndex = 0,
  className,
}: {
  /** The active story's index — segments up to and including it read as filled. */
  activeIndex?: number;
  avatarSrc?: string;
  caption?: string;
  className?: string;
  /** How many stories rotate (one progress segment each). */
  count?: number;
  displayName?: string;
  username?: string;
}) {
  const { t } = useTranslation();

  const name = displayName ?? username;
  // No identity yet (a bare { id, platform } account) → skeleton the avatar + name.
  const enriched = Boolean(username || displayName || avatarSrc);

  return (
    <div className={cn("absolute inset-0 flex flex-col text-white", className)}>
      {/* progress bar — one segment per story, filled up to the active one */}
      <div className="flex gap-[0.25em] px-[1em] pt-[1em]">
        {Array.from({ length: Math.max(1, count) }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-[0.2em] flex-1 rounded-full",
              i <= activeIndex ? "bg-white" : "bg-white/40",
            )}
          />
        ))}
      </div>

      {/* header */}
      <div className="flex items-center gap-[0.5em] px-[1em] pt-[0.7em]">
        {enriched ? (
          <UserAvatar
            name={name}
            src={avatarSrc}
            size="sm"
            className="size-[1.9em] ring-1 ring-white/70"
          />
        ) : (
          <Skeleton className="size-[1.9em] rounded-full bg-white/30" />
        )}
        {enriched ? (
          <span className="truncate font-semibold">{name}</span>
        ) : (
          <Skeleton className="h-[0.85em] w-[6em] rounded-full bg-white/30" />
        )}
        <span className="text-[0.85em] text-white/80">4h</span>
        <MoreIcon className="ms-auto size-[1.2em] shrink-0"
          aria-hidden />
        <CloseIcon className="size-[1.2em] shrink-0"
          aria-hidden />
      </div>

      {/* spacer pushes the caption + send bar to the bottom */}
      <div className="flex-1" />

      {/* caption — a small chip pinned to the bottom-leading edge, one line, truncated */}
      {caption ? (
        <div className="px-[1em] pb-[0.5em]">
          <span className="inline-block max-w-[62%] truncate rounded-[0.35em] bg-black/45 px-[0.6em] py-[0.3em] text-[0.9em] font-medium">
            {caption}
          </span>
        </div>
      ) : null}

      {/* bottom send bar */}
      <div className="flex items-center gap-[0.6em] px-[1em] pt-[0.7em] pb-[1.4em]">
        <span className="flex-1 rounded-full border border-white/60 px-[1em] py-[0.55em] text-[0.85em] text-white/80">
          Send message
        </span>
        <HeartIcon className="size-[1.5em] shrink-0"
          aria-label={t("preview.actions.love")} />
        <ThumbUpIcon className="size-[1.5em] shrink-0"
          aria-label={t("preview.actions.like")} />
      </div>
    </div>
  );
}

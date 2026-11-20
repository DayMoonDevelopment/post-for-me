import type { ComponentProps } from "react";

import { UserAvatar } from "~/components/user-avatar";
import { cn } from "~/lib/utils";
import { IconPlaceholder } from "~/ui/icon-placeholder";
import { Skeleton } from "~/ui/skeleton";

import type { SocialPostPreviewMedia } from "~/lib/social-post-preview-types";
import {
  flatMediaToItem,
  type SocialPostPreviewFlatMediaProps,
} from "~/components/social-post-preview/social-post-preview-flat-media";
import { SocialPostPreviewMediaItem } from "~/components/social-post-preview/social-post-preview-media";

/**
 * The **YouTube** family — YouTube's two strictly-primitive surfaces: the landscape
 * {@link YouTubeVideo} watch page ({@link YouTubeVideoMedia} 16:9 player) and the vertical
 * {@link YouTubeShort} ({@link YouTubeShortMedia} + {@link YouTubeShortUI}). These take raw
 * props / children only — no descriptor, no auto-mapping:
 *
 * ```tsx
 * <YouTubeVideo username="sundarpixel" caption={"Title line\nDescription…"}>
 *   <YouTubeVideoMedia imageSrc={cover} />
 * </YouTubeVideo>
 *
 * <YouTubeShort>
 *   <YouTubeShortMedia videoSrc={videoUrl} thumbnailSrc={thumbnailUrl} />
 *   <YouTubeShortUI username="sundarpixel" caption="Behind the scenes 🎬" />
 * </YouTubeShort>
 * ```
 *
 * YouTube has no short/video flag in the API — the real product picks the surface from the
 * media's orientation. {@link SocialPostPreview} does the same: it sniffs the cover (portrait →
 * Short, else Video) and maps the post onto these primitives inside the device. Posts carry one
 * caption but YouTube splits title/description, so the video page treats the caption's first
 * line as the title and the rest as the description. Sized in `em` off the device's `text-[4cqi]`
 * base. An empty identity renders as a skeleton.
 */

/** Split the single caption into a YouTube-style title (first line) + description (rest). */
function splitTitle(caption: string): { title: string; description: string } {
  const [first, ...rest] = caption.split("\n");
  return { title: first ?? "", description: rest.join("\n").trim() };
}

/**
 * The landscape video (watch page) shell — the black bar + player slot, then the white content
 * region (title · channel · description · actions · subscribe · comments skeleton). Drop the
 * {@link YouTubeVideoMedia} player (or your own) inside as the media slot. Title + description
 * are split from `caption` (first line · rest).
 */
export function YouTubeVideo({
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
} & ComponentProps<"div">) {
  const name = displayName ?? username ?? "";
  const { title, description } = splitTitle(caption ?? "");
  // No identity yet (a bare { id, platform } account) → skeleton the channel row.
  const enriched = Boolean(username || displayName || avatarSrc);

  return (
    <div
      data-slot="youtube-video"
      data-surface="video"
      className={cn(
        // Black top region (bar + player) meets the bezel with no white behind it at the
        // rounded corners; the white content sits in its own region below.
        "flex h-full flex-col bg-black leading-snug",
        "[&_[data-slot=skeleton]]:animate-none",
        className,
      )}
      {...props}
    >
      {/* a black bar taller than the device's inner corner radius, so the full-width player
          sits entirely below the rounding with none of it clipped */}
      <div className="h-[2.8em] shrink-0 bg-black" />

      {/* player slot — drop <YouTubeVideoMedia> (or your own) here */}
      {children}

      {/* white content region — kept off the black top so nothing white sits behind the
          bar/player at the rounded corners */}
      <div className="flex flex-1 flex-col bg-background">
        <div className="flex flex-col gap-[0.5em] p-[0.9em]">
          <p className="line-clamp-2 text-[1.05em] font-semibold">{title}</p>
          {enriched ? (
            <p className="text-[0.8em] text-muted-foreground">
              {username} · just now
            </p>
          ) : (
            <Skeleton className="h-[0.8em] w-[9em] rounded-full" />
          )}
          {description ? (
            <p className="line-clamp-2 text-[0.85em] text-muted-foreground">
              {description}
            </p>
          ) : null}

          {/* action row — no fabricated counts */}
          <div className="flex items-center gap-[1.1em] pt-[0.2em] text-muted-foreground [&_svg]:size-[1.2em]">
            <IconPlaceholder
              lucide="ThumbsUp"
              tabler="IconThumbUp"
              phosphor="ThumbsUp"
              hugeicons="ThumbsUpIcon"
              remixicon="RiThumbUpLine"
              aria-label="Like"
            />
            <IconPlaceholder
              lucide="ThumbsDown"
              tabler="IconThumbDown"
              phosphor="ThumbsDown"
              hugeicons="ThumbsDownIcon"
              remixicon="RiThumbDownLine"
              aria-label="Dislike"
            />
            <IconPlaceholder
              lucide="Share2"
              tabler="IconShare3"
              phosphor="ShareFat"
              hugeicons="Share08Icon"
              remixicon="RiShareForwardLine"
              aria-label="Share"
            />
            <IconPlaceholder
              lucide="Download"
              tabler="IconDownload"
              phosphor="DownloadSimple"
              hugeicons="Download04Icon"
              remixicon="RiDownloadLine"
              aria-label="Download"
            />
          </div>

          {/* channel + subscribe */}
          <div className="mt-[0.2em] flex items-center gap-[0.6em] border-t border-border pt-[0.7em]">
            {enriched ? (
              <>
                <UserAvatar
                  name={name}
                  src={avatarSrc ?? undefined}
                  size="sm"
                  className="size-[2.2em]"
                />
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {name}
                </span>
              </>
            ) : (
              <>
                <Skeleton className="size-[2.2em] shrink-0 rounded-full" />
                <Skeleton className="mr-auto h-[0.85em] w-[7em] rounded-full" />
              </>
            )}
            <span className="rounded-full bg-foreground px-[0.9em] py-[0.35em] text-[0.85em] font-semibold text-background">
              Subscribe
            </span>
          </div>
        </div>

        {/* comments / up-next skeleton so the page reads as a real watch view */}
        <div className="flex flex-1 flex-col gap-[0.9em] border-t border-border p-[0.9em] opacity-65">
          <div className="flex gap-[0.6em]">
            <Skeleton className="size-[2em] shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-[0.35em]">
              <Skeleton className="h-[0.7em] w-[40%] rounded-full" />
              <Skeleton className="h-[0.7em] w-[85%] rounded-full" />
            </div>
          </div>
          <div className="flex gap-[0.6em]">
            <Skeleton className="aspect-video w-[42%] shrink-0 rounded-[0.4em]" />
            <div className="flex flex-1 flex-col gap-[0.35em]">
              <Skeleton className="h-[0.7em] w-[90%] rounded-full" />
              <Skeleton className="h-[0.7em] w-[55%] rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The video player layer — the 16:9 player with its play badge. Pass flat props: `imageSrc` /
 * `thumbnailSrc` for the cover still, or `videoSrc` for a clip.
 */
export function YouTubeVideoMedia({
  className,
  ...media
}: SocialPostPreviewFlatMediaProps & { className?: string }) {
  return (
    <YouTubeVideoMediaFill media={flatMediaToItem(media)} className={className} />
  );
}

/** The 16:9 player, shared by the video shell (full media object) and the flat layer above. */
function YouTubeVideoMediaFill({
  media,
  className,
}: {
  media?: SocialPostPreviewMedia;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-video shrink-0 bg-black", className)}>
      {media ? (
        <SocialPostPreviewMediaItem
          media={media}
          className="size-full object-cover"
        />
      ) : null}
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-[2.6em] place-items-center rounded-full bg-black/55 text-white [&_svg]:size-[1.3em]">
          <IconPlaceholder
            lucide="Play"
            tabler="IconPlayerPlayFilled"
            phosphor="Play"
            hugeicons="PlayIcon"
            remixicon="RiPlayFill"
            aria-hidden
          />
        </span>
      </span>
    </div>
  );
}

/**
 * The YouTube Short **frame** — the relative, full-bleed 9:19.5 container the media + UI layers
 * stack inside. Compose {@link YouTubeShortMedia} + {@link YouTubeShortUI} (or your own overlays)
 * as children. The **`9/19.5` aspect is baked in** — Shorts are always vertical. Sized in `em`
 * off the device's `text-[4cqi]` base.
 */
export function YouTubeShort({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="youtube-short"
      data-surface="short"
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
 * The Short media layer — the cover fills the frame with a scrim for overlay legibility. Pass
 * flat props: `videoSrc` + `thumbnailSrc` for a clip, or `imageSrc` for a photo cover.
 */
export function YouTubeShortMedia({
  className,
  ...media
}: SocialPostPreviewFlatMediaProps & { className?: string }) {
  return (
    <YouTubeShortMediaFill media={flatMediaToItem(media)} className={className} />
  );
}

/** Internal fill shared by the Short chrome (full media object) and the flat layer above. */
function YouTubeShortMediaFill({
  media,
  className,
}: {
  media?: SocialPostPreviewMedia;
  className?: string;
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

/** The Short UI layer — the right action rail and the bottom-left meta, overlaid on the media. */
export function YouTubeShortUI({
  username,
  displayName,
  avatarSrc,
  caption,
  className,
}: {
  username?: string;
  displayName?: string;
  avatarSrc?: string;
  caption?: string;
  className?: string;
}) {
  const name = displayName ?? username;
  // No identity yet (a bare { id, platform } account) → skeleton the meta avatar + handle.
  const enriched = Boolean(username || displayName || avatarSrc);

  return (
    <div className={cn("absolute inset-0 text-white", className)}>
      {/* right action rail */}
      <div className="absolute right-[0.7em] bottom-[3em] flex flex-col items-center gap-[1.2em] drop-shadow [&_svg]:size-[1.6em]">
        <IconPlaceholder
          lucide="ThumbsUp"
          tabler="IconThumbUp"
          phosphor="ThumbsUp"
          hugeicons="ThumbsUpIcon"
          remixicon="RiThumbUpFill"
          aria-label="Like"
        />
        <IconPlaceholder
          lucide="ThumbsDown"
          tabler="IconThumbDown"
          phosphor="ThumbsDown"
          hugeicons="ThumbsDownIcon"
          remixicon="RiThumbDownFill"
          aria-label="Dislike"
        />
        <IconPlaceholder
          lucide="MessageCircle"
          tabler="IconMessageCircle"
          phosphor="ChatCircle"
          hugeicons="Comment01Icon"
          remixicon="RiChat3Fill"
          aria-label="Comment"
        />
        <IconPlaceholder
          lucide="Share2"
          tabler="IconShare3"
          phosphor="ShareFat"
          hugeicons="Share08Icon"
          remixicon="RiShareForwardFill"
          aria-label="Share"
        />
      </div>

      {/* bottom-left meta */}
      <div className="absolute inset-x-0 bottom-0 space-y-[0.45em] p-[0.9em] pr-[3.2em] pb-[3em]">
        <div className="flex items-center gap-[0.5em]">
          {enriched ? (
            <>
              <UserAvatar
                name={name}
                src={avatarSrc}
                size="sm"
                className="size-[2em] ring-1 ring-white/80"
              />
              <span className="truncate font-semibold">@{username}</span>
            </>
          ) : (
            <>
              <Skeleton className="size-[2em] shrink-0 rounded-full bg-white/30" />
              <Skeleton className="h-[0.9em] w-[6em] rounded-full bg-white/30" />
            </>
          )}
          <span className="rounded-[0.35em] bg-white px-[0.6em] py-[0.15em] text-[0.8em] font-semibold text-black">
            Subscribe
          </span>
        </div>
        {caption ? <p className="line-clamp-2 text-[0.92em]">{caption}</p> : null}
      </div>
    </div>
  );
}

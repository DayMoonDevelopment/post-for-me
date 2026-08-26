"use client";

import { useEffect, useState } from "react";
import type { ComponentProps } from "react";

import { UserAvatar } from "~/components/user-avatar";
import { cn } from "~/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "~/ui/carousel";
import { IconPlaceholder } from "~/ui/icon-placeholder";
import { Skeleton } from "~/ui/skeleton";

import type { SocialPostPreviewMedia } from "~/lib/social-post-preview-types";
import {
  flatMediaToItem,
  flatMediaToList,
  type SocialPostPreviewFlatMediaProps,
} from "~/components/social-post-preview/social-post-preview-flat-media";
import { SocialPostPreviewMediaItem } from "~/components/social-post-preview/social-post-preview-media";

/**
 * The **InstagramPost** family — a strictly-primitive Instagram feed post. `InstagramPost` is
 * the shell (story-ring avatar · username · verified check · the like/comment/share/save row ·
 * caption); drop {@link InstagramPostMedia} inside as the media slot:
 *
 * ```tsx
 * <InstagramPost username="aperture" avatarSrc={url} caption="golden hour ✨">
 *   <InstagramPostMedia imageSrc={[a, b]} />
 * </InstagramPost>
 * ```
 *
 * Raw props/children only — no descriptor, no auto-mapping. For a whole Post for Me post, use
 * {@link SocialPostPreview}, which maps it onto these and wraps them in the shared
 * feed context + device. A carousel is the real shadcn Carousel, so it swipes. Sized in `em`
 * off the device's `text-[4cqi]` base. Action glyphs come from the icon library, not branded
 * marks — the story-ring avatar, verified check, and action row identify it. An empty identity
 * renders the header as a skeleton.
 */
export function InstagramPost({
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
  const enriched = Boolean(username || displayName || avatarSrc);

  return (
    <article
      data-slot="instagram-post"
      data-surface="feed"
      className={cn("flex flex-col bg-background leading-snug", className)}
      {...props}
    >
      {/* header — story-ring avatar, username, verified check, ⋯ menu */}
      <div className="flex items-center gap-[0.6em] p-[0.7em]">
        {enriched ? (
          <>
            <span className="rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 p-[0.15em]">
              <span className="block rounded-full bg-background p-[0.12em]">
                <UserAvatar
                  name={displayName ?? username ?? ""}
                  src={avatarSrc ?? undefined}
                  size="sm"
                  className="size-[2em]"
                />
              </span>
            </span>
            <span className="truncate font-semibold">{username}</span>
            <IconPlaceholder
              lucide="BadgeCheck"
              tabler="IconRosetteDiscountCheckFilled"
              phosphor="SealCheck"
              hugeicons="CheckmarkBadge01Icon"
              remixicon="RiVerifiedBadgeFill"
              className="size-[1.1em] shrink-0 text-[#0095f6]"
              aria-label="Verified"
            />
          </>
        ) : (
          <>
            <Skeleton className="size-[2.3em] shrink-0 rounded-full" />
            <Skeleton className="h-[0.85em] w-[6em] rounded-full" />
          </>
        )}
        <IconPlaceholder
          lucide="Ellipsis"
          tabler="IconDots"
          phosphor="DotsThree"
          hugeicons="MoreHorizontalIcon"
          remixicon="RiMoreLine"
          className="ml-auto size-[1.3em] shrink-0 text-muted-foreground"
          aria-hidden
        />
      </div>

      {/* media slot — drop <InstagramPostMedia> (or your own) here */}
      {children}

      {/* action bar — like / comment / share on the left, save on the right */}
      <div className="flex items-center gap-[0.7em] px-[0.7em] pt-[0.6em] text-foreground [&_svg]:size-[1.45em]">
        <IconPlaceholder
          lucide="Heart"
          tabler="IconHeart"
          phosphor="Heart"
          hugeicons="FavouriteIcon"
          remixicon="RiHeart3Line"
          aria-label="Like"
        />
        <IconPlaceholder
          lucide="MessageCircle"
          tabler="IconMessageCircle"
          phosphor="ChatCircle"
          hugeicons="Comment01Icon"
          remixicon="RiChat3Line"
          className="-scale-x-100"
          aria-label="Comment"
        />
        <IconPlaceholder
          lucide="Send"
          tabler="IconSend"
          phosphor="PaperPlaneTilt"
          hugeicons="Sent01Icon"
          remixicon="RiSendPlaneLine"
          aria-label="Share"
        />
        <IconPlaceholder
          lucide="Bookmark"
          tabler="IconBookmark"
          phosphor="BookmarkSimple"
          hugeicons="Bookmark01Icon"
          remixicon="RiBookmarkLine"
          className="ml-auto"
          aria-label="Save"
        />
      </div>

      {/* caption — username in bold, then the copy; timestamp underneath */}
      <div className="space-y-[0.25em] px-[0.7em] pt-[0.5em] pb-[0.8em]">
        {caption ? (
          <p className="break-words whitespace-pre-wrap">
            {enriched ? (
              <>
                <span className="font-semibold">{username}</span>{" "}
              </>
            ) : null}
            {caption}
          </p>
        ) : null}
        <p className="text-[0.8em] text-muted-foreground">2 hours ago</p>
      </div>
    </article>
  );
}

// Instagram frames feed media between 1.91:1 (landscape) and 4:5 (portrait). Post for Me
// media carries no dimensions, so we infer the ratio from the loaded image itself (the
// honest source) rather than a hardcoded hint, clamped to IG's allowed range.
const IG_MIN_RATIO = 4 / 5;
const IG_MAX_RATIO = 1.91;
function clampIgRatio(ratio: number): number {
  return Math.min(IG_MAX_RATIO, Math.max(IG_MIN_RATIO, ratio));
}

/**
 * The post's media. Instagram sizes the whole post to the FIRST media's aspect ratio (a
 * carousel's slides all share it), measured from the loaded image — square until it loads.
 * One item renders a plain frame; a carousel renders the real, swipeable shadcn Carousel
 * with a stacked badge and a dots row that tracks the current slide.
 */
function IgMedia({
  media,
  className,
}: {
  media: SocialPostPreviewMedia[];
  className?: string;
}) {
  const [ratio, setRatio] = useState(1);
  const measure = (width: number, height: number) => {
    if (width && height) {
      setRatio(clampIgRatio(width / height));
    }
  };

  if (media.length <= 1) {
    return (
      <IgMediaFrame
        item={media[0]}
        ratio={ratio}
        onDimensions={measure}
        className={className}
      />
    );
  }
  return (
    <IgCarousel
      media={media}
      ratio={ratio}
      onFirstDimensions={measure}
      className={className}
    />
  );
}

/**
 * The Instagram feed media layer — a single ratio-fit frame, or a swipeable carousel past one
 * image. Pass flat props: `imageSrc` for photos, or `videoSrc` + `thumbnailSrc` for a clip.
 */
export function InstagramPostMedia({
  media: mediaProp,
  className,
  ...flat
}: {
  className?: string;
  media?: SocialPostPreviewMedia[];
} & SocialPostPreviewFlatMediaProps) {
  const list = mediaProp ?? flatMediaToList(flat);
  if (list.length === 0) return null;
  return <IgMedia media={list} className={className} />;
}

/** A single media frame — media cropped to `ratio`, with a play badge over a video. */
function IgMediaFrame({
  item,
  ratio,
  onDimensions,
  className,
}: {
  item?: SocialPostPreviewMedia;
  ratio: number;
  onDimensions?: (width: number, height: number) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("relative bg-muted", className)}
      style={{ aspectRatio: ratio }}
    >
      {item ? (
        <SocialPostPreviewMediaItem media={item} onDimensions={onDimensions} />
      ) : null}
      {item?.kind === "video" ? (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-[2.4em] place-items-center rounded-full bg-black/45 text-white [&_svg]:size-[1.2em]">
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
      ) : null}
    </div>
  );
}

/** The multi-image carousel — real shadcn Carousel (swipe/drag) + IG's stacked badge + dots. */
function IgCarousel({
  media,
  ratio,
  onFirstDimensions,
  className,
}: {
  media: SocialPostPreviewMedia[];
  ratio: number;
  onFirstDimensions: (width: number, height: number) => void;
  className?: string;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const update = () => setCurrent(api.selectedScrollSnap());
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  return (
    <div className={className}>
      <div className="relative">
        <Carousel setApi={setApi} className="w-full">
          <CarouselContent className="ml-0">
            {media.map((item, index) => (
              <CarouselItem key={item.id} className="pl-0">
                <IgMediaFrame
                  item={item}
                  ratio={ratio}
                  onDimensions={index === 0 ? onFirstDimensions : undefined}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* stacked-squares badge — IG's "this is a carousel" marker */}
        <span className="pointer-events-none absolute top-[0.6em] right-[0.6em] text-white drop-shadow [&_svg]:size-[1.2em]">
          <IconPlaceholder
            lucide="Copy"
            tabler="IconCopy"
            phosphor="Copy"
            hugeicons="Copy01Icon"
            remixicon="RiFileCopyLine"
            aria-hidden
          />
        </span>
      </div>

      {/* dots — the active one tracks the current slide */}
      <div className="flex items-center justify-center gap-[0.35em] py-[0.55em]">
        {media.slice(0, 8).map((item, index) => (
          <span
            key={item.id}
            className={cn(
              "size-[0.4em] rounded-full transition-colors",
              index === current ? "bg-[#0095f6]" : "bg-muted-foreground/40",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The Instagram Reel **frame** — the relative, full-bleed 9:19.5 container the media + UI
 * layers stack inside. Compose {@link InstagramReelMedia} + {@link InstagramReelUI} (or your
 * own overlays) as children. Strictly primitive — for a whole post, use
 * {@link SocialPostPreview}. White overlays, no fabricated counts; sized in `em`
 * off the device's `text-[4cqi]` base.
 */
export function InstagramReel({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="instagram-reel"
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
 * The media layer — the cover fills the frame with a scrim for overlay legibility. Pass flat
 * props: `videoSrc` + `thumbnailSrc` for a clip, or `imageSrc` for a photo cover.
 */
export function InstagramReelMedia({
  className,
  ...media
}: SocialPostPreviewFlatMediaProps & { className?: string }) {
  return (
    <InstagramReelMediaFill
      media={flatMediaToItem(media)}
      className={className}
    />
  );
}

/** Internal fill shared by the composed chrome (full media object) and the flat layer above. */
function InstagramReelMediaFill({
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
      {/* scrim — darken the bottom (and a touch of the top) so the overlays stay legible */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-black/25" />
    </div>
  );
}

/** The UI layer — the right action rail and the bottom-left meta, overlaid on the media. */
export function InstagramReelUI({
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
  // No identity yet (a bare { id, platform } account) → skeleton the avatar + handle.
  const enriched = Boolean(username || displayName || avatarSrc);

  return (
    <div className={cn("absolute inset-0 text-white", className)}>
      {/* right action rail — lifted off the bottom-right so the device's rounded corner
          doesn't clip the lowest items */}
      <div className="absolute right-[0.85em] bottom-[3em] z-10 flex flex-col items-center gap-[1.05em] drop-shadow [&_svg]:size-[1.6em]">
        <IconPlaceholder
          lucide="Heart"
          tabler="IconHeart"
          phosphor="Heart"
          hugeicons="FavouriteIcon"
          remixicon="RiHeart3Line"
          aria-label="Like"
        />
        <IconPlaceholder
          lucide="MessageCircle"
          tabler="IconMessageCircle"
          phosphor="ChatCircle"
          hugeicons="Comment01Icon"
          remixicon="RiChat3Line"
          className="-scale-x-100"
          aria-label="Comment"
        />
        <IconPlaceholder
          lucide="Repeat2"
          tabler="IconRepeat"
          phosphor="Repeat"
          hugeicons="RepeatIcon"
          remixicon="RiRepeat2Line"
          aria-label="Repost"
        />
        <IconPlaceholder
          lucide="Send"
          tabler="IconSend"
          phosphor="PaperPlaneTilt"
          hugeicons="Sent01Icon"
          remixicon="RiSendPlaneLine"
          aria-label="Share"
        />
        <IconPlaceholder
          lucide="Ellipsis"
          tabler="IconDots"
          phosphor="DotsThree"
          hugeicons="MoreHorizontalIcon"
          remixicon="RiMoreLine"
          aria-label="More"
        />
        {/* audio thumbnail — a reel's "original audio" is keyed to the creator */}
        <span className="mt-[0.15em] size-[1.7em] overflow-hidden rounded-[0.4em] border border-white/70">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <span className="block size-full bg-white/20" />
          )}
        </span>
      </div>

      {/* bottom-left meta — avatar · username · verified, caption, audio row. Extra bottom
          + left inset so the rounded device corner doesn't clip the last line */}
      <div className="absolute inset-x-0 bottom-0 z-10 space-y-[0.5em] p-[1em] pr-[3.2em] pb-[3em]">
        <div className="flex items-center gap-[0.5em]">
          {enriched ? (
            <UserAvatar
              name={name}
              src={avatarSrc}
              size="sm"
              className="size-[1.9em] ring-1 ring-white/80"
            />
          ) : (
            <Skeleton className="size-[1.9em] rounded-full bg-white/30" />
          )}
          {enriched ? (
            <span className="truncate font-semibold">{username}</span>
          ) : (
            <Skeleton className="h-[0.85em] w-[6em] rounded-full bg-white/30" />
          )}
          {enriched ? (
            <IconPlaceholder
              lucide="BadgeCheck"
              tabler="IconRosetteDiscountCheckFilled"
              phosphor="SealCheck"
              hugeicons="CheckmarkBadge01Icon"
              remixicon="RiVerifiedBadgeFill"
              className="size-[1em] shrink-0"
              aria-label="Verified"
            />
          ) : null}
        </div>

        {caption ? (
          <p className="line-clamp-2 text-[0.92em]">{caption}</p>
        ) : null}

        <div className="flex items-center gap-[0.4em] text-[0.82em]">
          <IconPlaceholder
            lucide="Music"
            tabler="IconMusic"
            phosphor="MusicNotes"
            hugeicons="MusicNote01Icon"
            remixicon="RiMusic2Line"
            className="size-[1em] shrink-0"
            aria-hidden
          />
          {enriched ? (
            <span className="truncate">{username} · Original audio</span>
          ) : (
            <Skeleton className="h-[0.8em] w-[8em] rounded-full bg-white/30" />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Instagram Story — vertical full-bleed. Two composable layers stack: {@link
 * InstagramStoryMedia} (the media fill + legibility scrim) and {@link
 * InstagramStoryUI} (the progress bar + header + caption chip + send
 * bar over it). Use this composed chrome, or the layers directly to swap either. The **`9/19.5`
 * aspect is baked in** — a Story is always vertical, so the chrome renders correctly even
 * outside the device frame. White overlays, scrims top and bottom for legibility.
 *
 * Sized in `em` off the device's `text-[4cqi]` base, so it scales with the frame.
 */
/**
 * The Instagram Story **frame** — the relative, full-bleed 9:19.5 container the media + UI
 * layers stack inside. Compose {@link InstagramStoryMedia} + {@link InstagramStoryUI} (or your
 * own overlays) as children. Strictly primitive — for a whole post, use
 * {@link SocialPostPreview}.
 */
export function InstagramStory({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="instagram-story"
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
 * The media layer — the cover fills the frame with a top + bottom scrim for legibility. Pass
 * flat props: `videoSrc` + `thumbnailSrc` for a clip, or `imageSrc` for a photo cover.
 */
export function InstagramStoryMedia({
  className,
  ...media
}: SocialPostPreviewFlatMediaProps & { className?: string }) {
  return (
    <InstagramStoryMediaFill
      media={flatMediaToItem(media)}
      className={className}
    />
  );
}

/** Internal fill shared by the composed chrome (full media object) and the flat layer above. */
function InstagramStoryMediaFill({
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
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/45" />
    </div>
  );
}

/**
 * The UI layer — the progress bar, header, caption chip, and send bar over the media. A story
 * post can carry several media (Post for Me publishes one story each): pass `count` (how many)
 * and `activeIndex` (which is showing) to drive the segmented progress bar, one segment per story.
 */
export function InstagramStoryUI({
  username,
  displayName,
  avatarSrc,
  caption,
  className,
  count = 1,
  activeIndex = 0,
}: {
  username?: string;
  displayName?: string;
  avatarSrc?: string;
  caption?: string;
  className?: string;
  /** How many stories rotate (one progress segment each). */
  count?: number;
  /** Which story is showing (segments up to it read as seen). */
  activeIndex?: number;
}) {
  const name = displayName ?? username;
  // No identity yet (a bare { id, platform } account) → skeleton the avatar + handle.
  const enriched = Boolean(username || displayName || avatarSrc);

  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col text-white",
        className,
      )}
    >
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
          <span className="truncate font-semibold">{username}</span>
        ) : (
          <Skeleton className="h-[0.85em] w-[6em] rounded-full bg-white/30" />
        )}
        <span className="text-[0.85em] text-white/80">1h</span>
        <IconPlaceholder
          lucide="Ellipsis"
          tabler="IconDots"
          phosphor="DotsThree"
          hugeicons="MoreHorizontalIcon"
          remixicon="RiMoreLine"
          className="ml-auto size-[1.2em] shrink-0"
          aria-hidden
        />
        <IconPlaceholder
          lucide="X"
          tabler="IconX"
          phosphor="X"
          hugeicons="Cancel01Icon"
          remixicon="RiCloseLine"
          className="size-[1.2em] shrink-0"
          aria-hidden
        />
      </div>

      {/* spacer pushes the caption + send bar to the bottom */}
      <div className="flex-1" />

      {/* caption — a small chip pinned to the bottom-leading edge, one line, truncated */}
      {caption ? (
        <div className="px-[1em] pb-[0.5em]">
          <span className="inline-block max-w-[62%] truncate rounded-full bg-black/45 px-[0.8em] py-[0.3em] text-[0.9em] font-medium">
            {caption}
          </span>
        </div>
      ) : null}

      {/* bottom send bar */}
      <div className="flex items-center gap-[0.6em] px-[1em] pt-[0.7em] pb-[1.4em]">
        <span className="flex-1 rounded-full border border-white/60 px-[1em] py-[0.55em] text-[0.85em] text-white/80">
          Send message
        </span>
        <IconPlaceholder
          lucide="Heart"
          tabler="IconHeart"
          phosphor="Heart"
          hugeicons="FavouriteIcon"
          remixicon="RiHeart3Line"
          className="size-[1.5em] shrink-0"
          aria-label="Like"
        />
        <IconPlaceholder
          lucide="Send"
          tabler="IconSend"
          phosphor="PaperPlaneTilt"
          hugeicons="Sent01Icon"
          remixicon="RiSendPlaneLine"
          className="size-[1.5em] shrink-0"
          aria-label="Share"
        />
      </div>
    </div>
  );
}

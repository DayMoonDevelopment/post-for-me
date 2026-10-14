import type { ComponentProps } from "react";

import { UserAvatar } from "~/components/user-avatar";
import { cn } from "~/lib/utils";
import { IconPlaceholder } from "~/ui/icon-placeholder";
import { Skeleton } from "~/ui/skeleton";

import type {
  SocialPostPreviewDescriptor,
  SocialPostPreviewMedia,
} from "~/lib/social-post-preview-types";
import {
  flatMediaToItem,
  type SocialPostPreviewFlatMediaProps,
} from "~/components/social-post-preview/social-post-preview-flat-media";
import { SocialPostPreviewMediaItem } from "~/components/social-post-preview/social-post-preview-media";

/**
 * The **TikTokPost** family — a strictly-primitive TikTok video surface (vertical full-bleed,
 * `9/19.5`). Compose it by hand:
 *
 * ```tsx
 * <TikTokPost>
 *   <TikTokPostMedia videoSrc={url} thumbnailSrc={poster} />
 *   <TikTokPostUI username="creatorhub" caption="Behind the scenes 🎬" />
 * </TikTokPost>
 * ```
 *
 * These take raw props/children only — no descriptor, no auto-mapping. To preview a whole
 * Post for Me post, use {@link SocialPostPreview}, which maps the post onto these
 * primitives for you. Sized in `em` off the device's `text-[4cqi]` base, so it scales with
 * the frame.
 *
 * `TikTokPost` is the frame: the relative 9:19.5 container the media + UI layers stack inside.
 */
export function TikTokPost({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="tiktok-post"
      data-surface="video"
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
 * The media layer — fills the frame with a scrim for overlay legibility. Pass flat props:
 * `videoSrc` + `thumbnailSrc` for a clip, or `imageSrc` for a photo cover.
 */
export function TikTokPostMedia({
  className,
  ...media
}: SocialPostPreviewFlatMediaProps & { className?: string }) {
  return (
    <TikTokMediaFill media={flatMediaToItem(media)} className={className} />
  );
}

/** Internal fill shared by the composed chrome (full media object) and the flat layer above. */
function TikTokMediaFill({
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

/** The UI layer — the right action rail + bottom-left meta. Give it the identity + caption. */
export function TikTokPostUI({
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
  // No identity yet (a bare { id, platform } account) → skeleton the avatars + handle.
  const enriched = Boolean(username || displayName || avatarSrc);

  return (
    <div className={cn("absolute inset-0 text-white", className)}>
      {/* right action rail */}
      <div className="absolute right-[0.7em] bottom-[3em] flex flex-col items-center gap-[1.1em]">
        {/* creator avatar with a follow + */}
        <span className="relative mb-[0.3em]">
          {enriched ? (
            <UserAvatar
              name={name}
              src={avatarSrc}
              size="sm"
              className="size-[2.4em] ring-1 ring-white"
            />
          ) : (
            <Skeleton className="size-[2.4em] rounded-full bg-white/30" />
          )}
          <span className="absolute -bottom-[0.5em] left-1/2 grid size-[1.1em] -translate-x-1/2 place-items-center rounded-full bg-[#fe2c55] text-white [&_svg]:size-[0.7em]">
            <IconPlaceholder
              lucide="Plus"
              tabler="IconPlus"
              phosphor="Plus"
              hugeicons="PlusSignIcon"
              remixicon="RiAddLine"
              aria-hidden
            />
          </span>
        </span>

        <span className="drop-shadow [&_svg]:size-[1.7em]">
          <IconPlaceholder
            lucide="Heart"
            tabler="IconHeart"
            phosphor="Heart"
            hugeicons="FavouriteIcon"
            remixicon="RiHeart3Fill"
            aria-label="Like"
          />
        </span>
        <span className="drop-shadow [&_svg]:size-[1.7em]">
          <IconPlaceholder
            lucide="MessageCircle"
            tabler="IconMessageCircle"
            phosphor="ChatCircle"
            hugeicons="Comment01Icon"
            remixicon="RiChat3Fill"
            aria-label="Comment"
          />
        </span>
        <span className="drop-shadow [&_svg]:size-[1.7em]">
          <IconPlaceholder
            lucide="Bookmark"
            tabler="IconBookmark"
            phosphor="BookmarkSimple"
            hugeicons="Bookmark01Icon"
            remixicon="RiBookmarkFill"
            aria-label="Save"
          />
        </span>
        <span className="drop-shadow [&_svg]:size-[1.7em]">
          <IconPlaceholder
            lucide="Share2"
            tabler="IconShare3"
            phosphor="ShareFat"
            hugeicons="Share08Icon"
            remixicon="RiShareForwardFill"
            aria-label="Share"
          />
        </span>

        {/* spinning-audio disc — the creator's art */}
        <span className="mt-[0.3em] grid size-[2.2em] place-items-center rounded-full bg-gradient-to-tr from-neutral-700 to-neutral-900 ring-2 ring-black/30">
          {enriched ? (
            <UserAvatar
              name={name}
              src={avatarSrc}
              size="sm"
              className="size-[1.3em]"
            />
          ) : (
            <Skeleton className="size-[1.3em] rounded-full bg-white/40" />
          )}
        </span>
      </div>

      {/* bottom-left meta */}
      <div className="absolute inset-x-0 bottom-0 space-y-[0.4em] p-[0.9em] pr-[3.4em] pb-[3em]">
        {enriched ? (
          <span className="font-semibold">@{username}</span>
        ) : (
          <Skeleton className="h-[0.9em] w-[6em] rounded-full bg-white/30" />
        )}
        {caption ? <p className="line-clamp-2">{caption}</p> : null}
        <div className="flex items-center gap-[0.4em] text-[0.85em]">
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
            <span className="truncate">original sound - {username}</span>
          ) : (
            <Skeleton className="h-[0.8em] w-[8em] rounded-full bg-white/30" />
          )}
        </div>
      </div>
    </div>
  );
}

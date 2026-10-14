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
 * The **PinterestPin** family — a strictly-primitive Pinterest pin: {@link PinterestPin} is the
 * shell (the pin image slot fills the top, then the action row + red Save button, the pin title,
 * and the creator); drop {@link PinterestPinMedia} inside as the image slot:
 *
 * ```tsx
 * <PinterestPin username="pinner" avatarSrc={url} caption="Weeknight pasta">
 *   <PinterestPinMedia imageSrc={photo} />
 * </PinterestPin>
 * ```
 *
 * A pin carries a single piece of media (unlike the feed collages). These take raw props /
 * children only — no descriptor, no auto-mapping. To preview a whole Post for Me post, use
 * {@link SocialPostPreview}, which maps the post onto these primitives inside the device. Sized
 * in `em` off the device's `text-[4cqi]` base. No fabricated counts. An empty identity renders
 * the creator row as a skeleton.
 */
export function PinterestPin({
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
  const enriched = Boolean(username || displayName || avatarSrc);

  return (
    <div
      data-slot="pinterest-pin"
      data-surface="pin"
      className={cn(
        "flex h-full flex-col gap-[0.8em] bg-background p-[0.7em] pb-[1.3em] leading-snug",
        className,
      )}
      {...props}
    >
      {/* pin image slot — drop <PinterestPinMedia> (or your own) here; it fills the space
          above the controls */}
      <div className="min-h-0 flex-1">{children}</div>

      {/* action bar + Save */}
      <div className="flex items-center gap-[1.1em] px-[0.3em] text-foreground [&_svg]:size-[1.35em]">
        <IconPlaceholder
          lucide="Heart"
          tabler="IconHeart"
          phosphor="Heart"
          hugeicons="FavouriteIcon"
          remixicon="RiHeart3Line"
          aria-label="React"
        />
        <IconPlaceholder
          lucide="MessageCircle"
          tabler="IconMessageCircle"
          phosphor="ChatCircle"
          hugeicons="Comment01Icon"
          remixicon="RiChat3Line"
          aria-label="Comment"
        />
        <IconPlaceholder
          lucide="Upload"
          tabler="IconShare3"
          phosphor="Export"
          hugeicons="Share08Icon"
          remixicon="RiShareLine"
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
        <span className="ml-auto rounded-full bg-[#e60023] px-[1.2em] py-[0.5em] text-[0.9em] font-semibold text-white">
          Save
        </span>
      </div>

      {/* title + creator */}
      <div className="space-y-[0.5em] px-[0.3em]">
        {caption ? (
          <p className="line-clamp-2 font-semibold break-words">{caption}</p>
        ) : null}
        <div className="flex items-center gap-[0.5em]">
          {enriched ? (
            <>
              <UserAvatar
                name={name}
                src={avatarSrc ?? undefined}
                size="sm"
                className="size-[1.8em]"
              />
              <span className="truncate text-[0.9em] font-medium">{name}</span>
            </>
          ) : (
            <>
              <Skeleton className="size-[1.8em] shrink-0 rounded-full" />
              <Skeleton className="h-[0.8em] w-[6em] rounded-full" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The Pinterest media layer — the pin image in its rounded card, filling its container. Pass flat
 * props: `imageSrc` for a photo, or `videoSrc` + `thumbnailSrc` for a clip. Inside
 * {@link PinterestPin} it fills the pin's image region; standalone, give its container a height.
 */
export function PinterestPinMedia({
  className,
  ...media
}: SocialPostPreviewFlatMediaProps & { className?: string }) {
  return (
    <PinterestMediaFill media={flatMediaToItem(media)} className={className} />
  );
}

/** The rounded pin-image card, shared by the composed chrome and the flat layer above. */
function PinterestMediaFill({
  media,
  className,
}: {
  media?: SocialPostPreviewMedia;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative size-full overflow-hidden rounded-[1.2em] bg-muted",
        className,
      )}
    >
      {media ? (
        <SocialPostPreviewMediaItem
          media={media}
          className="size-full object-cover"
        />
      ) : null}
    </div>
  );
}

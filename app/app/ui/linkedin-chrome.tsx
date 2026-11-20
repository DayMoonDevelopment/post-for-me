import type { ComponentProps } from "react";

import { useTranslation } from "react-i18next";

import type { SocialPostPreviewMedia } from "~/lib/social-post-preview-types";

import { FeedMediaGrid } from "~/components/social-post-preview/social-post-preview-feed-media";
import {
  flatMediaToList,
  type SocialPostPreviewFlatMediaProps,
} from "~/components/social-post-preview/social-post-preview-flat-media";
import { UserAvatar } from "~/components/user-avatar";
import { CommentIcon, GlobeIcon, MoreIcon, RepostIcon, SendIcon, ThumbUpIcon } from "~/icons";
import { cn } from "~/lib/utils";
import { Skeleton } from "~/ui/skeleton";

/**
 * The **LinkedInPost** family — a strictly-primitive LinkedIn timeline post: {@link LinkedInPost}
 * is the shell (header: avatar · name · connection degree · time · caption · the Like / Comment /
 * Repost / Send bar); drop {@link LinkedInPostMedia} inside as the media slot:
 *
 * ```tsx
 * <LinkedInPost username="sundarpixel" displayName="Sundar" avatarSrc={url} caption="Shipping ✨">
 *   <LinkedInPostMedia imageSrc={[a, b]} />
 * </LinkedInPost>
 * ```
 *
 * These take raw props / children only — no descriptor, no auto-mapping. To preview a whole Post
 * for Me post, use {@link SocialPostPreview}, which maps the post onto these primitives and wraps
 * them in the shared feed context + device. Sized in `em` off the device's `text-[4cqi]` base.
 * No fabricated reaction counts. An empty identity renders the header as a skeleton.
 */
export function LinkedInPost({
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
  const { t } = useTranslation();

  const name = displayName ?? username ?? "";
  const enriched = Boolean(username || displayName || avatarSrc);

  return (
    <article
      data-slot="linkedin-post"
      data-surface="feed"
      className={cn(
        "flex flex-col bg-background py-[0.6em] leading-snug",
        className,
      )}
      {...props}
    >
      {/* header */}
      <div className="flex items-start gap-[0.6em] px-[0.9em] py-[0.3em]">
        {enriched ? (
          <UserAvatar
            name={name}
            src={avatarSrc ?? undefined}
            size="sm"
            className="size-[2.8em]"
          />
        ) : (
          <Skeleton className="size-[2.8em] shrink-0 rounded-full" />
        )}
        <div className="flex min-w-0 flex-col gap-[0.25em]">
          {enriched ? (
            <>
              <span className="flex items-center gap-[0.3em] truncate font-semibold">
                {name}
                <span className="font-normal text-muted-foreground">
                  {t("preview.mock.connectionDegree")}
                </span>
              </span>
              <span className="truncate text-[0.8em] text-muted-foreground">
                @{username}
              </span>
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
        <p className="px-[0.9em] py-[0.4em] break-words whitespace-pre-wrap">
          {caption}
        </p>
      ) : null}

      {/* media slot — drop <LinkedInPostMedia> (or your own) here, edge to edge */}
      {children}

      {/* action bar */}
      <div className="mx-[0.9em] mt-[0.5em] flex items-center justify-around border-t border-border pt-[0.5em] text-[0.9em] font-medium text-muted-foreground [&_svg]:size-[1.2em]">
        <span className="flex items-center gap-[0.35em]">
          <ThumbUpIcon aria-hidden />
          Like
        </span>
        <span className="flex items-center gap-[0.35em]">
          <CommentIcon aria-hidden />
          Comment
        </span>
        <span className="flex items-center gap-[0.35em]">
          <RepostIcon aria-hidden />
          Repost
        </span>
        <span className="flex items-center gap-[0.35em]">
          <SendIcon aria-hidden />
          Send
        </span>
      </div>
    </article>
  );
}

/**
 * The LinkedIn media layer — the edge-to-edge collage (1 full-width, 2–4 tiled, "+N" past four).
 * Pass the resolved `media` array (full fidelity) or flat props: `imageSrc` for photos (one URL
 * or an array), or `videoSrc` + `thumbnailSrc` for a clip.
 */
export function LinkedInPostMedia({
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

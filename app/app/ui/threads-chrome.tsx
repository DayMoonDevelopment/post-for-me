import type { ComponentProps } from "react";

import { useTranslation } from "react-i18next";

import type { SocialPostPreviewMedia } from "~/lib/social-post-preview-types";

import { FeedMediaGrid } from "~/components/social-post-preview/social-post-preview-feed-media";
import {
  flatMediaToList,
  type SocialPostPreviewFlatMediaProps,
} from "~/components/social-post-preview/social-post-preview-flat-media";
import { UserAvatar } from "~/components/user-avatar";
import { AddIcon, CommentIcon, HeartIcon, MoreIcon, RepostIcon, SendIcon, VerifiedIcon } from "~/icons";
import { cn } from "~/lib/utils";
import { Skeleton } from "~/ui/skeleton";

/**
 * The **ThreadsPost** family — a strictly-primitive Threads timeline post: {@link ThreadsPost} is
 * the shell (avatar-left with a follow +, header: username · verified · time · caption · the
 * like / comment / repost / share row); drop {@link ThreadsPostMedia} inside as the media slot:
 *
 * ```tsx
 * <ThreadsPost username="mosseri" avatarSrc={url} caption="gm">
 *   <ThreadsPostMedia imageSrc={[a, b]} />
 * </ThreadsPost>
 * ```
 *
 * These take raw props / children only — no descriptor, no auto-mapping. To preview a whole Post
 * for Me post, use {@link SocialPostPreview}, which maps the post onto these primitives and wraps
 * them in the shared feed context + device. Sized in `em` off the device's `text-[4cqi]` base.
 * No fabricated counts. An empty identity renders the header as a skeleton.
 */
export function ThreadsPost({
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

  const enriched = Boolean(username || displayName || avatarSrc);

  return (
    <article
      data-slot="threads-post"
      data-surface="feed"
      className={cn(
        "flex gap-[0.6em] bg-background p-[0.9em] leading-snug",
        className,
      )}
      {...props}
    >
      {/* avatar with a follow + (self-start so the badge pins to the avatar, not the
          full-height column) */}
      <div className="relative shrink-0 self-start">
        {enriched ? (
          <UserAvatar
            name={displayName ?? username ?? ""}
            src={avatarSrc ?? undefined}
            size="sm"
            className="size-[2.4em]"
          />
        ) : (
          <Skeleton className="size-[2.4em] shrink-0 rounded-full" />
        )}
        <span className="absolute -end-[0.2em] -bottom-[0.2em] grid size-[1.15em] place-items-center rounded-full border-2 border-background bg-foreground text-background [&_svg]:size-[0.6em]">
          <AddIcon aria-hidden />
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-[0.4em]">
        {/* header */}
        <div className="flex items-center gap-[0.3em]">
          {enriched ? (
            <>
              <span className="truncate font-semibold">{username}</span>
              <VerifiedIcon className="size-[1em] shrink-0 text-[#0095f6]"
                aria-label={t("preview.actions.verified")} />
            </>
          ) : (
            <Skeleton className="h-[0.85em] w-[6em] rounded-full" />
          )}
          <span className="ms-auto flex items-center gap-[0.4em] text-[0.85em] text-muted-foreground">
            2h
            <MoreIcon className="size-[1.1em]"
              aria-hidden />
          </span>
        </div>

        {/* caption */}
        {caption ? (
          <p className="break-words whitespace-pre-wrap">{caption}</p>
        ) : null}

        {/* media slot — drop <ThreadsPostMedia> (or your own) here */}
        {children}

        {/* action bar */}
        <div className="mt-[0.1em] flex items-center gap-[1.4em] text-foreground [&_svg]:size-[1.25em]">
          <HeartIcon aria-label={t("preview.actions.like")} />
          <CommentIcon aria-label={t("preview.actions.comment")} />
          <RepostIcon aria-label={t("preview.actions.repost")} />
          <SendIcon aria-label={t("preview.actions.share")} />
        </div>
      </div>
    </article>
  );
}

/**
 * The Threads media layer — the rounded collage (1 full-width, 2–4 tiled, "+N" past four). Pass
 * the resolved `media` array (full fidelity) or flat props: `imageSrc` for photos (one URL or an
 * array), or `videoSrc` + `thumbnailSrc` for a clip.
 */
export function ThreadsPostMedia({
  media: mediaProp,
  className,
  ...flat
}: {
  className?: string;
  media?: SocialPostPreviewMedia[];
} & SocialPostPreviewFlatMediaProps) {
  const items = mediaProp ?? flatMediaToList(flat);
  return <FeedMediaGrid media={items} rounded className={className} />;
}

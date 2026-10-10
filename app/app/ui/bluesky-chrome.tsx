import type { ComponentProps } from "react";

import { useTranslation } from "react-i18next";

import type { SocialPostPreviewMedia } from "~/lib/social-post-preview-types";

import { FeedMediaGrid } from "~/components/social-post-preview/social-post-preview-feed-media";
import {
  flatMediaToList,
  type SocialPostPreviewFlatMediaProps,
} from "~/components/social-post-preview/social-post-preview-flat-media";
import { UserAvatar } from "~/components/user-avatar";
import { CommentIcon, HeartIcon, RepostIcon, ShareIcon, VerifiedIcon } from "~/icons";
import { cn } from "~/lib/utils";
import { Skeleton } from "~/ui/skeleton";

/**
 * The **BlueskyPost** family — a strictly-primitive Bluesky timeline post: {@link BlueskyPost} is
 * the shell (avatar-left, header: name · handle · time · caption · the reply / repost / like /
 * share row); drop {@link BlueskyPostMedia} inside as the media slot:
 *
 * ```tsx
 * <BlueskyPost username="jay.bsky.team" displayName="Jay" avatarSrc={url} caption="gm">
 *   <BlueskyPostMedia imageSrc={[a, b]} />
 * </BlueskyPost>
 * ```
 *
 * These take raw props / children only — no descriptor, no auto-mapping. To preview a whole Post
 * for Me post, use {@link SocialPostPreview}, which maps the post onto these primitives and wraps
 * them in the shared feed context + device. Sized in `em` off the device's `text-[4cqi]` base.
 * No fabricated counts. An empty identity renders the header as a skeleton.
 */
export function BlueskyPost({
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
      data-slot="bluesky-post"
      data-surface="feed"
      className={cn(
        "flex gap-[0.6em] bg-background p-[0.9em] leading-snug",
        className,
      )}
      {...props}
    >
      {enriched ? (
        <UserAvatar
          name={name}
          src={avatarSrc ?? undefined}
          size="sm"
          className="size-[2.4em] shrink-0"
        />
      ) : (
        <Skeleton className="size-[2.4em] shrink-0 rounded-full" />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-[0.4em]">
        {/* header */}
        <div className="flex items-center gap-[0.3em]">
          {enriched ? (
            <>
              <span className="truncate font-semibold">{name}</span>
              <VerifiedIcon className="size-[1em] shrink-0 text-[#0085ff]"
                aria-label={t("preview.actions.verified")} />
              <span className="truncate text-muted-foreground">
                @{username} · 20h
              </span>
            </>
          ) : (
            <>
              <Skeleton className="h-[0.85em] w-[6em] rounded-full" />
              <Skeleton className="h-[0.8em] w-[4em] rounded-full" />
            </>
          )}
        </div>

        {/* caption */}
        {caption ? (
          <p className="break-words whitespace-pre-wrap">{caption}</p>
        ) : null}

        {/* media slot — drop <BlueskyPostMedia> (or your own) here */}
        {children}

        {/* action bar */}
        <div className="mt-[0.1em] flex items-center justify-between pe-[1.5em] text-muted-foreground [&_svg]:size-[1.15em]">
          <CommentIcon aria-label={t("preview.actions.reply")} />
          <RepostIcon aria-label={t("preview.actions.repost")} />
          <HeartIcon aria-label={t("preview.actions.like")} />
          <ShareIcon aria-label={t("preview.actions.share")} />
        </div>
      </div>
    </article>
  );
}

/**
 * The Bluesky media layer — the rounded collage (1 full-width, 2–4 tiled, "+N" past four). Pass
 * the resolved `media` array (full fidelity) or flat props: `imageSrc` for photos (one URL or an
 * array), or `videoSrc` + `thumbnailSrc` for a clip.
 */
export function BlueskyPostMedia({
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

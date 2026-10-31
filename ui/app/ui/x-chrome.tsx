import type { ComponentProps } from "react";

import { UserAvatar } from "~/components/user-avatar";
import { cn } from "~/lib/utils";
import { IconPlaceholder } from "~/ui/icon-placeholder";
import { Skeleton } from "~/ui/skeleton";

import type { SocialPostPreviewMedia } from "~/lib/social-post-preview-types";
import {
  flatMediaToList,
  type SocialPostPreviewFlatMediaProps,
} from "~/components/social-post-preview/social-post-preview-flat-media";
import { SocialPostPreviewMediaItem } from "~/components/social-post-preview/social-post-preview-media";

/**
 * The **XPost** family — a strictly-primitive X (Twitter) timeline post. `XPost` is the shell
 * (avatar · header · caption · the reply / repost / like / views / share row); drop
 * {@link XPostMedia} and/or {@link XPostQuote} inside as children:
 *
 * ```tsx
 * <XPost username="jack" displayName="jack" avatarSrc={url} caption="gm">
 *   <XPostMedia imageSrc={[a, b]} />
 *   <XPostQuote username="dhh" caption="…" imageSrc={c} />
 * </XPost>
 * ```
 *
 * These take raw props/children only — no descriptor, no auto-mapping. To preview a whole Post
 * for Me post, use {@link SocialPostPreview}, which maps the post onto these
 * primitives and wraps them in the shared feed context + device. Sized in `em` off the device's
 * `text-[4cqi]` base. Action glyphs come from the icon library, not branded marks. An empty
 * identity (no username / displayName / avatar) renders the header as a skeleton.
 */
export function XPost({
  username,
  displayName,
  avatarSrc,
  caption,
  className,
  children,
  ...props
}: {
  username?: string | null;
  displayName?: string | null;
  avatarSrc?: string | null;
  caption?: string;
} & ComponentProps<"article">) {
  const enriched = Boolean(username || displayName || avatarSrc);
  const name = displayName ?? username ?? "";

  return (
    <article
      data-slot="x-post"
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
          className="size-[2.6em] shrink-0"
        />
      ) : (
        <Skeleton className="size-[2.6em] shrink-0 rounded-full" />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-[0.5em]">
        {/* header — real identity, or a skeleton when the account isn't enriched */}
        <div className="flex items-center gap-[0.3em]">
          {enriched ? (
            <>
              <span className="truncate font-semibold">{name}</span>
              <span className="truncate text-muted-foreground">
                @{username} · 2h
              </span>
            </>
          ) : (
            <>
              <Skeleton className="h-[0.9em] w-[6em] rounded-full" />
              <Skeleton className="h-[0.8em] w-[4.5em] rounded-full" />
            </>
          )}
          <IconPlaceholder
            lucide="Ellipsis"
            tabler="IconDots"
            phosphor="DotsThree"
            hugeicons="MoreHorizontalIcon"
            remixicon="RiMoreLine"
            className="ml-auto size-[1.2em] shrink-0 text-muted-foreground"
            aria-hidden
          />
        </div>

        {/* caption */}
        {caption ? (
          <p className="break-words whitespace-pre-wrap">{caption}</p>
        ) : null}

        {/* media + quote slots (in order) */}
        {children}

        {/* action bar — library glyphs, no branded marks */}
        <div className="mt-[0.3em] flex items-center justify-between text-muted-foreground [&_svg]:size-[1.15em]">
          <IconPlaceholder
            lucide="MessageCircle"
            tabler="IconMessageCircle"
            phosphor="ChatCircle"
            hugeicons="Comment01Icon"
            remixicon="RiChat3Line"
            aria-label="Reply"
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
            lucide="Heart"
            tabler="IconHeart"
            phosphor="Heart"
            hugeicons="FavouriteIcon"
            remixicon="RiHeart3Line"
            aria-label="Like"
          />
          <IconPlaceholder
            lucide="BarChart3"
            tabler="IconChartBar"
            phosphor="ChartBar"
            hugeicons="Analytics01Icon"
            remixicon="RiBarChartLine"
            aria-label="Views"
          />
          <IconPlaceholder
            lucide="Share"
            tabler="IconShare"
            phosphor="Export"
            hugeicons="Share08Icon"
            remixicon="RiShareLine"
            aria-label="Share"
          />
        </div>
      </div>
    </article>
  );
}

/**
 * The tweet's media layer — one image full-width, 2–4 in X's grids; videos get a play badge.
 * Pass the resolved `media` array (full fidelity) or flat props: `imageSrc` for photos (one URL
 * or an array), or `videoSrc` + `thumbnailSrc` for a clip. Reused inside {@link XPostQuote} — pass
 * `className` (e.g. `rounded-none border-0`) to drop its card border when it's nested.
 */
export function XPostMedia({
  media: mediaProp,
  className,
  ...flat
}: {
  className?: string;
  media?: SocialPostPreviewMedia[];
} & SocialPostPreviewFlatMediaProps) {
  const items = (mediaProp ?? flatMediaToList(flat)).slice(0, 4);
  const count = items.length;
  if (count === 0) return null;

  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-[0.9em] border border-border",
        count === 1 && "grid-cols-1",
        count === 2 && "grid-cols-2",
        count >= 3 && "grid-cols-2 grid-rows-2",
        className,
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          className={cn(
            "relative bg-muted",
            count === 1 && "aspect-[16/9]",
            count === 2 && "aspect-square",
            count === 3 && index === 0 && "row-span-2 h-full",
            count === 3 && index !== 0 && "aspect-[16/9]",
            count >= 4 && "aspect-square",
          )}
        >
          <SocialPostPreviewMediaItem media={item} />
          {item.kind === "video" ? (
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-[2em] place-items-center rounded-full bg-black/55 text-white [&_svg]:size-[1.1em]">
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
      ))}
    </div>
  );
}

/**
 * The embedded quote-tweet card X shows for a quote repost. Give it the quoted account's flat
 * identity + caption, plus its media the same way as the top-level post — the resolved `media`
 * array or flat props (`imageSrc`, `videoSrc` + `thumbnailSrc`), rendered by the shared
 * {@link XPostMedia}. Pass `placeholder` for the skeleton X shows for a bare `quote_tweet_id`
 * with no content yet.
 */
export function XPostQuote({
  username,
  displayName,
  avatarSrc,
  caption,
  media: mediaProp,
  placeholder,
  className,
  ...flat
}: {
  avatarSrc?: string | null;
  caption?: string;
  className?: string;
  displayName?: string | null;
  media?: SocialPostPreviewMedia[];
  placeholder?: boolean;
  username?: string | null;
} & SocialPostPreviewFlatMediaProps) {
  // Unenriched (a bare quote_tweet_id) → a skeleton, still shaped like a real quoted tweet.
  if (placeholder || !(username || displayName || avatarSrc)) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-[0.9em] border border-border",
          className,
        )}
      >
        <div className="flex flex-col gap-[0.4em] p-[0.7em]">
          <div className="flex items-center gap-[0.4em]">
            <Skeleton className="size-[1.5em] shrink-0 rounded-full" />
            <Skeleton className="h-[0.8em] w-[5em] rounded-full" />
            <Skeleton className="h-[0.75em] w-[4em] rounded-full" />
          </div>
          <div className="space-y-[0.3em]">
            <Skeleton className="h-[0.7em] w-[92%] rounded-full" />
            <Skeleton className="h-[0.7em] w-[60%] rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  const name = displayName ?? username ?? "";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[0.9em] border border-border",
        className,
      )}
    >
      <div className="flex flex-col gap-[0.35em] p-[0.7em]">
        <div className="flex items-center gap-[0.4em]">
          <UserAvatar
            name={name}
            src={avatarSrc ?? undefined}
            size="sm"
            className="size-[1.5em]"
          />
          <span className="truncate font-semibold">{name}</span>
          <span className="truncate text-muted-foreground">@{username}</span>
        </div>
        {caption ? (
          <p className="line-clamp-3 break-words">{caption}</p>
        ) : null}
      </div>
      {/* Same media renderer as the top-level post; the card's border + rounding already frame
          it, so drop XPostMedia's own (it self-nulls when there's nothing to show). */}
      <XPostMedia
        media={mediaProp}
        {...flat}
        className="rounded-none border-0"
      />
    </div>
  );
}

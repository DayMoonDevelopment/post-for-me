import type { ReactNode } from "react";

import { cn } from "~/lib/utils";
import { Skeleton } from "~/ui/skeleton";

/**
 * The **feed context** — a masked timeline of skeleton posts wrapped around a real post. This
 * is a COMPOSED layer, not baked into the chromes: a bare post (e.g. `XPost`)
 * renders just the post, so a consumer can drop it into their own card / border. The
 * auto-renderer wraps feed-surface chromes in this to make the phone read like a real timeline.
 */
export function SocialPostPreviewFeed({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="social-post-preview-feed"
      className={cn(
        "flex h-full flex-col divide-y divide-border bg-background leading-snug",
        "[&_[data-slot=skeleton]]:animate-none",
        // Fade the feed's edges so the skeleton context softens away (top 10%, bottom 25%).
        "[-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_10%,#000_75%,transparent)]",
        "[mask-image:linear-gradient(to_bottom,transparent,#000_10%,#000_75%,transparent)]",
        className,
      )}
    >
      <FeedTailSkeleton />
      {children}
      <FeedPostSkeleton />
    </div>
  );
}

/**
 * Shared feed-context skeletons for the timeline chromes (Facebook / LinkedIn / Threads /
 * Bluesky). The previewed post sits between a **tail** (the bottom of the previous post,
 * peeking in up top so the real post stays centered) and a **full** post below. Shapes are
 * the shadcn {@link Skeleton} primitive; the wrapper dims them to 65% so the context stays
 * quiet. Feed chromes mask the top/bottom edges so this fades away.
 */
export function FeedTailSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex shrink-0 flex-col p-[0.9em] opacity-65", className)}
      aria-hidden
    >
      <div className="flex items-center gap-[0.6em]">
        <Skeleton className="h-[0.7em] w-[45%] rounded-full" />
      </div>
      <div className="mt-[0.5em] space-y-[0.35em]">
        <Skeleton className="h-[0.7em] w-[92%] rounded-full" />
        <Skeleton className="h-[0.7em] w-[60%] rounded-full" />
      </div>
      <div className="mt-[0.7em] flex items-center gap-[1.4em]">
        <Skeleton className="h-[0.9em] w-[3.5em] rounded-full" />
        <Skeleton className="h-[0.9em] w-[3.5em] rounded-full" />
        <Skeleton className="h-[0.9em] w-[3.5em] rounded-full" />
      </div>
    </div>
  );
}

/** A full placeholder post — header, media, caption, action row. */
export function FeedPostSkeleton({
  withMedia = true,
  className,
}: {
  withMedia?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("flex shrink-0 flex-col p-[0.9em] opacity-65", className)}
      aria-hidden
    >
      <div className="flex items-center gap-[0.6em]">
        <Skeleton className="size-[2.4em] shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-[0.35em]">
          <Skeleton className="h-[0.8em] w-[40%] rounded-full" />
          <Skeleton className="h-[0.65em] w-[25%] rounded-full" />
        </div>
      </div>
      <div className="mt-[0.7em] space-y-[0.35em]">
        <Skeleton className="h-[0.7em] w-[95%] rounded-full" />
        <Skeleton className="h-[0.7em] w-[75%] rounded-full" />
      </div>
      {withMedia ? (
        <Skeleton className="mt-[0.7em] aspect-[4/3] w-full rounded-[0.4em]" />
      ) : null}
      <div className="mt-[0.7em] flex items-center gap-[1.4em]">
        <Skeleton className="h-[0.9em] w-[3.5em] rounded-full" />
        <Skeleton className="h-[0.9em] w-[3.5em] rounded-full" />
        <Skeleton className="h-[0.9em] w-[3.5em] rounded-full" />
      </div>
    </div>
  );
}

import type { SocialPostPreviewMedia } from "~/lib/social-post-preview-types";

import { PlayIcon } from "~/icons";
import { cn } from "~/lib/utils";

import { SocialPostPreviewMediaItem } from "./social-post-preview-media";

/**
 * Shared media grid for the timeline chromes (Facebook / LinkedIn / Threads / Bluesky): one
 * image full-width, or 2–4 in the familiar collage, with a "+N" overlay past four and a play
 * badge over a video. `rounded` toggles the corner treatment (Threads/Bluesky round the
 * collage; Facebook/LinkedIn run it edge to edge).
 */
export function FeedMediaGrid({
  media,
  rounded = false,
  className,
}: {
  className?: string;
  media: SocialPostPreviewMedia[];
  rounded?: boolean;
}) {
  const items = media.slice(0, 4);
  const count = items.length;
  const overflow = media.length - items.length;
  if (count === 0) return null;

  return (
    <div
      className={cn(
        "grid gap-[0.15em] overflow-hidden",
        rounded && "rounded-[0.6em] border border-border",
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
            count === 1 && "aspect-[4/3]",
            count === 3 && index === 0 && "row-span-2 h-full",
            (count === 2 || (count === 3 && index !== 0) || count >= 4) &&
              "aspect-square",
          )}
        >
          <SocialPostPreviewMediaItem media={item} />

          {item.kind === "video" ? (
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-[2em] place-items-center rounded-full bg-black/55 text-white [&_svg]:size-[1.1em]">
                <PlayIcon aria-hidden />
              </span>
            </span>
          ) : null}

          {overflow > 0 && index === items.length - 1 ? (
            <span className="absolute inset-0 grid place-items-center bg-black/50 text-[1.4em] font-semibold text-white">
              +{overflow}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

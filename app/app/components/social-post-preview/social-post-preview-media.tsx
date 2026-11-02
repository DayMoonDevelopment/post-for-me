import type { SyntheticEvent } from "react";

import type { SocialPostPreviewMedia } from "~/lib/social-post-preview-types";

import { cn } from "~/lib/utils";

/**
 * Renders ONE media item across the whole matrix, so every chrome shows media the same way:
 *
 * - **image** → `<img>`
 * - **video with a thumbnail** → `<img>` of the thumbnail (no browser `<video>` UI; the chrome
 *   draws its own play badge)
 * - **video without a thumbnail** → `<video preload="metadata">` (its own first frame shows; an
 *   `<img>` would try to load the `.mp4` as an image and break). Its native controls/overlay are
 *   suppressed so only the chrome's play badge shows.
 *
 * Media is URL-only here — a local `File`/`Blob` is materialized into an object URL upstream (at
 * the {@link SocialPostPreview} boundary), so this component stays a pure renderer.
 *
 * It renders only the media element (`object-cover` by default); chromes own the frame, the
 * aspect ratio, and any play-badge overlay. `onDimensions` reports the natural size once known
 * (from `<img>` load or `<video>` metadata) for chromes that size to the media (Instagram).
 */
export function SocialPostPreviewMediaItem({
  media,
  className,
  onDimensions,
}: {
  className?: string;
  media: SocialPostPreviewMedia;
  onDimensions?: (width: number, height: number) => void;
}) {
  if (media.kind === "video") {
    // Prefer the poster still (a thumbnail) as a plain image — no native <video> chrome.
    if (media.src) {
      return (
        <img
          src={media.src}
          alt=""
          className={cn("size-full object-cover", className)}
          onLoad={dimensionHandler(onDimensions)}
        />
      );
    }
    // No thumbnail: show the video's own first frame; hide native UI.
    if (!media.videoSrc) return null;
    return (
      <video
        src={media.videoSrc}
        muted
        playsInline
        preload="metadata"
        className={cn(
          "size-full object-cover",
          "[&::-webkit-media-controls]:hidden [&::-webkit-media-controls-start-playback-button]:hidden",
          className,
        )}
        onLoadedMetadata={
          onDimensions
            ? (event) => {
                const el = event.currentTarget;
                if (el.videoWidth && el.videoHeight) {
                  onDimensions(el.videoWidth, el.videoHeight);
                }
              }
            : undefined
        }
      />
    );
  }

  if (!media.src) return null;
  return (
    <img
      src={media.src}
      alt=""
      className={cn("size-full object-cover", className)}
      onLoad={dimensionHandler(onDimensions)}
    />
  );
}

function dimensionHandler(onDimensions?: (w: number, h: number) => void) {
  if (!onDimensions) return undefined;
  return (event: SyntheticEvent<HTMLImageElement>) => {
    const el = event.currentTarget;
    if (el.naturalWidth && el.naturalHeight) {
      onDimensions(el.naturalWidth, el.naturalHeight);
    }
  };
}

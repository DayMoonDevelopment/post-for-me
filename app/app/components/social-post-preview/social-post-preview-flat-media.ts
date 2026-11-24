import type { SocialPostPreviewMedia } from "~/lib/social-post-preview-types";

/**
 * The flat media props every chrome's `…Media` layer accepts, so a hand-composer passes plain
 * URLs — `imageSrc` for stills, `videoSrc` (+ `thumbnailSrc` poster) for clips — instead of
 * building a {@link SocialPostPreviewMedia} object. Each prop takes one URL or an array, so a
 * single-media surface and a grid / carousel use the SAME prop. The composed chrome
 * (descriptor-driven) keeps full per-item fidelity; these props are the by-hand ergonomic layer.
 */
export interface SocialPostPreviewFlatMediaProps {
  /** Still image URL(s) — one for single-media surfaces, several for a grid / carousel / collage. */
  imageSrc?: string | string[];
  /** Video poster / thumbnail still(s), paired by index with `videoSrc`. */
  thumbnailSrc?: string | string[];
  /** Playable video URL(s). */
  videoSrc?: string | string[];
}

/** One URL or an array of URLs → an array of URLs (nullish → empty). */
function toArray(value?: string | string[]): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Flat scalar props → the normalized {@link SocialPostPreviewMedia} list the internal renderers
 * consume. Any `videoSrc` / `thumbnailSrc` yields video items (poster = `thumbnailSrc`, paired by
 * index); otherwise `imageSrc` becomes image items. Ids are synthesized for keys.
 */
export function flatMediaToList({
  imageSrc,
  videoSrc,
  thumbnailSrc,
}: SocialPostPreviewFlatMediaProps): SocialPostPreviewMedia[] {
  const videos = toArray(videoSrc);
  const posters = toArray(thumbnailSrc);
  if (videos.length || posters.length) {
    return Array.from({ length: Math.max(videos.length, posters.length) }, (_, i) => ({
      id: `flat-video-${i}`,
      kind: "video",
      src: posters[i],
      videoSrc: videos[i],
    }));
  }
  return toArray(imageSrc)
    .filter(Boolean)
    .map((src, index) => ({ id: `flat-image-${index}`, kind: "image", src }));
}

/** The first normalized item, for single-media surfaces (verticals, Pinterest, YouTube Watch). */
export function flatMediaToItem(
  props: SocialPostPreviewFlatMediaProps,
): SocialPostPreviewMedia | undefined {
  return flatMediaToList(props)[0];
}

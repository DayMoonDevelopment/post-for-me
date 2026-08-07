import type { SocialProvider } from "~/lib/post-for-me.types";

/**
 * The maximum caption length each platform accepts, keyed by SocialProvider.
 * Approximate to each network's current published limit — a soft UI hint for
 * surfacing "characters left" per target (the tightest budget, X at 280, is the
 * one to watch), NOT a hard input cap. The platform is the source of truth on
 * rejection.
 */
export const PLATFORM_CAPTION_LIMITS: Record<SocialProvider, number> = {
  bluesky: 300,
  facebook: 63206,
  instagram: 2200,
  linkedin: 3000,
  pinterest: 500,
  threads: 500,
  tiktok: 2200,
  tiktok_business: 2200,
  x: 280,
  youtube: 5000,
};

/** Human labels for each provider — for group headers, tooltips, and chips. */
export const PLATFORM_LABELS: Record<SocialProvider, string> = {
  bluesky: "Bluesky",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  threads: "Threads",
  tiktok: "TikTok (Standard API)",
  tiktok_business: "TikTok (Business API)",
  x: "X",
  youtube: "YouTube",
};

/**
 * A stable display order for providers, so grouped lists (the Account Selector,
 * the blocks) don't reshuffle by object key order. Roughly most- to least-common.
 */
export const PLATFORM_ORDER: SocialProvider[] = [
  "instagram",
  "facebook",
  "x",
  "tiktok",
  "tiktok_business",
  "youtube",
  "linkedin",
  "threads",
  "pinterest",
  "bluesky",
];

// A grapheme segmenter so emoji and combined characters count as one, the way a
// person reads length. Lazily created; falls back to code points where
// Intl.Segmenter is unavailable.
let graphemeSegmenter: Intl.Segmenter | null | undefined;
function getGraphemeSegmenter(): Intl.Segmenter | null {
  if (graphemeSegmenter === undefined) {
    graphemeSegmenter =
      typeof Intl !== "undefined" && "Segmenter" in Intl
        ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
        : null;
  }
  return graphemeSegmenter;
}

/** Count the visible characters (graphemes) in a caption. */
export function countCaptionLength(text: string): number {
  if (!text) return 0;
  const segmenter = getGraphemeSegmenter();
  if (segmenter) return Array.from(segmenter.segment(text)).length;
  return [...text].length;
}

/**
 * The platform with the smallest limit among those given — the tightest budget,
 * the one to surface by default. Returns `null` for an empty list.
 */
export function getMostRestrictivePlatform(
  platforms: SocialProvider[],
): SocialProvider | null {
  if (platforms.length === 0) return null;
  return platforms.reduce((tightest, platform) =>
    PLATFORM_CAPTION_LIMITS[platform] < PLATFORM_CAPTION_LIMITS[tightest]
      ? platform
      : tightest,
  );
}

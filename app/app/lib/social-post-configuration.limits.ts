import type { SocialProvider } from "~/lib/post-for-me.types";

export const SOCIAL_POST_CONFIGURATION_LIMITS = {
  instagram: {
    captionMax: 2200,
    hashtagsMax: 30,
    mentionsMax: 20,
    carouselMax: 10,
  },
  facebook: {
    captionMax: 63206,
  },
  threads: {
    captionMax: 500,
    carouselMax: 4,
  },
  tiktok: {
    /** Photo-post title, capped shorter than the caption. */
    titleMax: 85,
    captionMax: 2200,
    photosMax: 32,
    /** Twitter-style privacy is mapped from these config values. */
    privacyValues: ["public", "private"],
  },
  tiktok_business: {
    titleMax: 85,
    captionMax: 2200,
    photosMax: 32,
    privacyValues: ["public", "private"],
  },
  x: {
    captionMax: 280,
    /** X Premium raises the ceiling; surfaced when the account has premium. */
    captionMaxPremium: 2200,
    imagesMax: 4,
    poll: {
      minOptions: 2,
      maxOptions: 4,
      optionMaxLength: 25,
      durationMinutesMin: 5,
      durationMinutesMax: 10080,
    },
  },
  youtube: {
    titleMax: 100,
    descriptionMax: 5000,
    /** Combined length of all tags. */
    tagsCharMax: 500,
    privacyValues: ["public", "unlisted", "private"],
    licenseValues: ["youtube", "creativeCommon"],
  },
  pinterest: {
    titleMax: 100,
    descriptionMax: 800,
  },
  linkedin: {
    captionMax: 3000,
    imagesMax: 20,
  },
  bluesky: {
    captionMax: 300,
    imagesMax: 4,
  },
} as const satisfies Record<SocialProvider, Record<string, unknown>>;

export type SocialPostConfigurationLimits =
  typeof SOCIAL_POST_CONFIGURATION_LIMITS;

/**
 * Platforms that reject a text-only post — they need at least one media item (a base media
 * or a platform/account media override). The rest (X, Bluesky, Threads, LinkedIn, Facebook)
 * accept text-only. A soft UI hint like the rest of this file; the API is the real arbiter.
 */
export const PLATFORMS_REQUIRING_MEDIA: readonly SocialProvider[] = [
  "instagram",
  "tiktok",
  "tiktok_business",
  "youtube",
  "pinterest",
];

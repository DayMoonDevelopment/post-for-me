/**
 * Utility functions for parsing and handling social media links
 */

export type SocialPlatform =
  | "twitter"
  | "x"
  | "linkedin"
  | "github"
  | "facebook"
  | "instagram"
  | "youtube"
  | "tiktok"
  | "pinterest"
  | "bluesky"
  | "threads"
  | "website"
  | "unknown";

export interface ParsedSocialLink {
  url: string;
  platform: SocialPlatform;
  displayName: string;
  username?: string;
}

/**
 * Parse a social media URL and determine the platform
 */
export function parseSocialLink(url: string, platformHint?: string): ParsedSocialLink {
  const lowerUrl = url.toLowerCase();
  const lowerHint = platformHint?.toLowerCase() || "";

  // X / Twitter
  if (
    lowerUrl.includes("twitter.com") ||
    lowerUrl.includes("x.com") ||
    lowerHint.includes("twitter") ||
    lowerHint.includes("x")
  ) {
    const match = url.match(/(?:twitter\.com|x\.com)\/([^/?]+)/);
    return {
      url,
      platform: "x",
      displayName: "X",
      username: match?.[1],
    };
  }

  // LinkedIn
  if (lowerUrl.includes("linkedin.com") || lowerHint.includes("linkedin")) {
    const match = url.match(/linkedin\.com\/in\/([^/?]+)/);
    return {
      url,
      platform: "linkedin",
      displayName: "LinkedIn",
      username: match?.[1],
    };
  }

  // GitHub
  if (lowerUrl.includes("github.com") || lowerHint.includes("github")) {
    const match = url.match(/github\.com\/([^/?]+)/);
    return {
      url,
      platform: "github",
      displayName: "GitHub",
      username: match?.[1],
    };
  }

  // Facebook
  if (lowerUrl.includes("facebook.com") || lowerHint.includes("facebook")) {
    const match = url.match(/facebook\.com\/([^/?]+)/);
    return {
      url,
      platform: "facebook",
      displayName: "Facebook",
      username: match?.[1],
    };
  }

  // Instagram
  if (lowerUrl.includes("instagram.com") || lowerHint.includes("instagram")) {
    const match = url.match(/instagram\.com\/([^/?]+)/);
    return {
      url,
      platform: "instagram",
      displayName: "Instagram",
      username: match?.[1],
    };
  }

  // YouTube
  if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be") || lowerHint.includes("youtube")) {
    const match = url.match(/youtube\.com\/(?:c\/|channel\/|@)?([^/?]+)/);
    return {
      url,
      platform: "youtube",
      displayName: "YouTube",
      username: match?.[1],
    };
  }

  // TikTok
  if (lowerUrl.includes("tiktok.com") || lowerHint.includes("tiktok")) {
    const match = url.match(/tiktok\.com\/@?([^/?]+)/);
    return {
      url,
      platform: "tiktok",
      displayName: "TikTok",
      username: match?.[1],
    };
  }

  // Pinterest
  if (lowerUrl.includes("pinterest.com") || lowerHint.includes("pinterest")) {
    const match = url.match(/pinterest\.com\/([^/?]+)/);
    return {
      url,
      platform: "pinterest",
      displayName: "Pinterest",
      username: match?.[1],
    };
  }

  // Bluesky
  if (lowerUrl.includes("bsky.app") || lowerHint.includes("bluesky") || lowerHint.includes("bsky")) {
    const match = url.match(/bsky\.app\/profile\/([^/?]+)/);
    return {
      url,
      platform: "bluesky",
      displayName: "Bluesky",
      username: match?.[1],
    };
  }

  // Threads
  if (lowerUrl.includes("threads.net") || lowerHint.includes("threads")) {
    const match = url.match(/threads\.net\/@?([^/?]+)/);
    return {
      url,
      platform: "threads",
      displayName: "Threads",
      username: match?.[1],
    };
  }

  // If it's a personal website or blog (common patterns)
  if (
    lowerHint.includes("website") ||
    lowerHint.includes("blog") ||
    lowerHint.includes("portfolio") ||
    (!lowerUrl.includes("twitter") &&
      !lowerUrl.includes("x.com") &&
      !lowerUrl.includes("linkedin") &&
      !lowerUrl.includes("github") &&
      !lowerUrl.includes("facebook") &&
      !lowerUrl.includes("instagram") &&
      !lowerUrl.includes("youtube") &&
      !lowerUrl.includes("tiktok") &&
      !lowerUrl.includes("pinterest") &&
      !lowerUrl.includes("bsky.app") &&
      !lowerUrl.includes("threads.net"))
  ) {
    return {
      url,
      platform: "website",
      displayName: "Website",
    };
  }

  return {
    url,
    platform: "unknown",
    displayName: "Link",
  };
}

/**
 * Get social media profile URL for meta tags
 */
export function getSocialProfileUrl(socials: Array<{ url: string; platform: string }>): string | undefined {
  // Prioritize professional networks for metadata
  const priorities: SocialPlatform[] = ["linkedin", "x", "twitter", "github", "website"];

  for (const priority of priorities) {
    const social = socials.find((s) => {
      const parsed = parseSocialLink(s.url, s.platform);
      return parsed.platform === priority;
    });
    if (social) {
      return social.url;
    }
  }

  // Return the first one if no priority match
  return socials[0]?.url;
}

export interface UniversalPostConfig {
  name: string;
  description: string;
}

export const UNIVERSAL_POST_CONFIGS: UniversalPostConfig[] = [
  {
    name: "Caption",
    description:
      "Include text content with every post. Character limits and formatting are handled per platform automatically.",
  },
  {
    name: "Media",
    description:
      "Attach images and videos. Post for Me processes media to meet each platform's requirements.",
  },
  {
    name: "Thumbnail",
    description:
      "Set custom video thumbnails for each media item, automatically optimized per platform.",
  },
  {
    name: "Scheduled posting",
    description:
      "Let your users post immediately or schedule to go out in the future.",
  },
  {
    name: "Draft mode",
    description:
      "Create posts as drafts for review workflows. Publish programmatically when your users are ready.",
  },
  {
    name: "Multi-account posting",
    description:
      "Post to multiple connected accounts in a single API call. Override captions or media per account as needed.",
  },
];

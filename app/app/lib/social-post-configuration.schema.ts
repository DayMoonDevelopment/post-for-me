import type { SocialProvider } from "~/lib/post-for-me.types";

import { SOCIAL_POST_CONFIGURATION_LIMITS as LIMITS } from "~/lib/social-post-configuration.limits";

/** Semantic grouping — a treatment renders one section per group, in this order. */
export type SocialPostConfigurationGroup =
  | "format"
  | "audience"
  | "interactions"
  | "disclosures"
  | "content"
  | "advanced";

export const SOCIAL_POST_CONFIGURATION_GROUP_ORDER: readonly SocialPostConfigurationGroup[] =
  ["format", "content", "audience", "interactions", "disclosures", "advanced"];

/** Human labels for each group — a UI shows one over a multi-field group (e.g. TikTok's interactions vs disclosures). */
export const SOCIAL_POST_CONFIGURATION_GROUP_LABELS: Record<
  SocialPostConfigurationGroup,
  string
> = {
  format: "Format",
  content: "Details",
  audience: "Audience",
  interactions: "Interactions",
  disclosures: "Disclosures",
  advanced: "More",
};

/** Suggested control for a field. A renderer may substitute an equivalent control. */
export type SocialPostConfigurationControl =
  | "segmented"
  | "select"
  | "switch"
  | "text"
  | "textarea"
  | "tags"
  | "number"
  | "datetime"
  | "poll"
  | "board";

export interface SocialPostConfigurationOption {
  /** Disable this option when the platform's current config matches (cross-field rule). */
  disabledWhen?: (config: Record<string, unknown>) => boolean;
  label: string;
  value: string;
}

export interface SocialPostConfigurationField {
  control: SocialPostConfigurationControl;
  default?: string | number | boolean | string[];
  /**
   * Disable this field when the platform's current config matches — a cross-field rule
   * the platform enforces (e.g. TikTok can't disclose branded content on a private
   * post). The UI should render it disabled, not hidden.
   */
  disabledWhen?: (config: Record<string, unknown>) => boolean;
  group: SocialPostConfigurationGroup;
  /** One-line helper copy for the field. */
  help?: string;
  /** The API key this field reads/writes (e.g. "placement", "privacy_status"). */
  key: string;
  label: string;
  /** Max items for tags/collaborators. */
  maxItems?: number;
  /** Max characters for text/textarea — sourced from LIMITS so it matches validation. */
  maxLength?: number;
  /** For enum-style controls (segmented/select). */
  options?: readonly SocialPostConfigurationOption[];
  placeholder?: string;
  /** Required by the platform — a UI should always show it, never hide it under "advanced". */
  required?: boolean;
  /**
   * Conditional visibility. The config bag is the CURRENT values for this platform.
   * When it returns false the field is hidden — the API ignores it in that state.
   */
  visibleWhen?: (config: Record<string, unknown>) => boolean;
}

const META_PLACEMENT: readonly SocialPostConfigurationOption[] = [
  { value: "reels", label: "Reel" },
  { value: "stories", label: "Story" },
  { value: "timeline", label: "Feed" },
];

const isReels = (c: Record<string, unknown>) => c.placement === "reels";

const instagram: readonly SocialPostConfigurationField[] = [
  {
    key: "placement",
    label: "Placement",
    group: "format",
    control: "segmented",
    options: META_PLACEMENT,
  },
  {
    key: "share_to_feed",
    label: "Also show in feed",
    group: "format",
    control: "switch",
    default: true,
    help: "Reels only. Off keeps the video in the Reels tab.",
    visibleWhen: isReels,
  },
  {
    key: "collaborators",
    label: "Collaborators",
    group: "content",
    control: "tags",
    help: "Instagram usernames to invite.",
  },
  {
    key: "location",
    label: "Location",
    group: "content",
    control: "text",
    help: "Page id of a place to tag.",
  },
  {
    key: "audio_name",
    label: "Audio name",
    group: "content",
    control: "text",
    help: "Reels only, and only for original audio.",
    visibleWhen: isReels,
  },
  {
    key: "trial_reel_type",
    label: "Trial reel",
    group: "advanced",
    control: "select",
    options: [
      { value: "manual", label: "Manual graduation" },
      { value: "performance", label: "Graduate on performance" },
    ],
    visibleWhen: isReels,
  },
];

const facebook: readonly SocialPostConfigurationField[] = [
  {
    key: "placement",
    label: "Placement",
    group: "format",
    control: "segmented",
    options: META_PLACEMENT,
  },
  {
    key: "location",
    label: "Location",
    group: "content",
    control: "text",
    help: "Page id of a place to tag.",
  },
  {
    key: "collaborators",
    label: "Collaborators",
    group: "content",
    control: "tags",
    help: "Reels only. Page ids to invite.",
    visibleWhen: isReels,
  },
  {
    key: "set_caption_for_each_image",
    label: "Caption every carousel image",
    group: "advanced",
    control: "switch",
    default: true,
  },
];

const threads: readonly SocialPostConfigurationField[] = [
  {
    key: "placement",
    label: "Placement",
    group: "format",
    control: "segmented",
    options: [
      { value: "reels", label: "Reel" },
      { value: "timeline", label: "Feed" },
    ],
  },
];

const tiktokPrivacy: readonly SocialPostConfigurationOption[] = [
  { value: "public", label: "Public" },
  // TikTok forbids "Only me" (private) once the post is disclosed as branded content.
  {
    value: "private",
    label: "Only me",
    disabledWhen: (c) => c.disclose_branded_content === true,
  },
];

const tiktokBase: readonly SocialPostConfigurationField[] = [
  {
    key: "title",
    label: "Title",
    group: "content",
    control: "text",
    maxLength: LIMITS.tiktok.titleMax,
    help: "Photo posts only.",
  },
  {
    key: "privacy_status",
    label: "Privacy",
    group: "audience",
    control: "segmented",
    options: tiktokPrivacy,
    required: true,
  },
  {
    key: "allow_comment",
    label: "Comments",
    group: "interactions",
    control: "switch",
    default: true,
  },
  {
    key: "allow_duet",
    label: "Duets",
    group: "interactions",
    control: "switch",
    default: true,
  },
  {
    key: "allow_stitch",
    label: "Stitch",
    group: "interactions",
    control: "switch",
    default: true,
  },
  {
    key: "disclose_your_brand",
    label: "Your brand",
    group: "disclosures",
    control: "switch",
    default: false,
    help: "Promoting your own business.",
  },
  {
    key: "disclose_branded_content",
    label: "Branded content",
    group: "disclosures",
    control: "switch",
    default: false,
    disabledWhen: (c) => c.privacy_status === "private",
    help: "Paid partnership. Can't be posted privately.",
  },
  {
    key: "is_draft",
    label: "Upload as draft",
    group: "advanced",
    control: "switch",
    default: false,
    help: "Finish posting inside the TikTok app.",
  },
  {
    key: "auto_add_music",
    label: "Auto-add music",
    group: "advanced",
    control: "switch",
    default: true,
    help: "Photo posts only.",
  },
];

const tiktok: readonly SocialPostConfigurationField[] = [
  ...tiktokBase,
  {
    key: "is_ai_generated",
    label: "AI-generated",
    group: "disclosures",
    control: "switch",
    default: false,
  },
];

// The Business provider drops `is_ai_generated`; otherwise identical fields.
const tiktok_business: readonly SocialPostConfigurationField[] = tiktokBase;

const x: readonly SocialPostConfigurationField[] = [
  {
    key: "poll",
    label: "Poll",
    group: "content",
    control: "poll",
    help: "2–4 options. A poll can't be combined with media.",
  },
  {
    key: "reply_settings",
    label: "Who can reply",
    group: "audience",
    control: "select",
    options: [
      { value: "following", label: "Accounts you follow" },
      { value: "mentionedUsers", label: "Mentioned only" },
      { value: "subscribers", label: "Subscribers" },
      { value: "verified", label: "Verified accounts" },
    ],
  },
  {
    key: "quote_tweet_id",
    label: "Quote post",
    group: "advanced",
    control: "text",
    help: "Id of the post to quote.",
  },
  {
    key: "community_id",
    label: "Community",
    group: "advanced",
    control: "text",
    help: "Id of a community to post into.",
  },
];

const youtube: readonly SocialPostConfigurationField[] = [
  {
    key: "title",
    label: "Title",
    group: "content",
    control: "text",
    maxLength: LIMITS.youtube.titleMax,
    required: true,
    help: "YouTube requires a title.",
  },
  {
    key: "description",
    label: "Description",
    group: "content",
    control: "textarea",
    maxLength: LIMITS.youtube.descriptionMax,
    help: "Falls back to the caption when empty.",
  },
  {
    key: "tags",
    label: "Tags",
    group: "content",
    control: "tags",
  },
  {
    key: "privacy_status",
    label: "Privacy",
    group: "audience",
    control: "segmented",
    options: [
      { value: "public", label: "Public" },
      { value: "unlisted", label: "Unlisted" },
      { value: "private", label: "Private" },
    ],
    default: "public",
  },
  {
    key: "made_for_kids",
    label: "Made for kids",
    group: "disclosures",
    control: "switch",
    default: false,
  },
  {
    key: "contains_synthetic_media",
    label: "Altered or synthetic",
    group: "disclosures",
    control: "switch",
    default: false,
  },
  {
    key: "category_id",
    label: "Category",
    group: "advanced",
    control: "text",
  },
  {
    key: "default_language",
    label: "Language",
    group: "advanced",
    control: "text",
    placeholder: "e.g. en",
  },
  {
    key: "license",
    label: "License",
    group: "advanced",
    control: "select",
    options: [
      { value: "youtube", label: "Standard YouTube" },
      { value: "creativeCommon", label: "Creative Commons" },
    ],
    default: "youtube",
  },
  {
    key: "embeddable",
    label: "Allow embedding",
    group: "advanced",
    control: "switch",
    default: true,
  },
  {
    key: "public_stats_viewable",
    label: "Public stats",
    group: "advanced",
    control: "switch",
    default: true,
  },
  {
    key: "publish_at",
    label: "Publish at",
    group: "advanced",
    control: "datetime",
    help: "Requires Private visibility.",
    visibleWhen: (c) => c.privacy_status === "private",
  },
  {
    key: "recording_date",
    label: "Recording date",
    group: "advanced",
    control: "datetime",
  },
];

const pinterest: readonly SocialPostConfigurationField[] = [
  {
    key: "board_ids",
    label: "Board",
    group: "format",
    control: "board",
    required: true,
    help: "Pinterest requires a board to pin to.",
  },
  {
    key: "title",
    label: "Title",
    group: "content",
    control: "text",
    maxLength: LIMITS.pinterest.titleMax,
  },
  {
    key: "link",
    label: "Destination link",
    group: "content",
    control: "text",
  },
];

const linkedin: readonly SocialPostConfigurationField[] = [
  {
    key: "reshare_post_id",
    label: "Reshare post",
    group: "content",
    control: "text",
    help: "UGC post id to reshare; the caption becomes the commentary.",
  },
];

// Bluesky has no platform-specific options — an empty field list is a first-class
// outcome, and a treatment should render its natural "no extra options" state.
const bluesky: readonly SocialPostConfigurationField[] = [];

/** The per-platform field schema — the map every renderer walks. */
export const SOCIAL_POST_CONFIGURATION_SCHEMA: Record<
  SocialProvider,
  readonly SocialPostConfigurationField[]
> = {
  instagram,
  facebook,
  threads,
  tiktok,
  tiktok_business,
  x,
  youtube,
  pinterest,
  linkedin,
  bluesky,
};

/** Fields for a platform whose `visibleWhen` passes for the given config values. */
export function getVisibleFields(
  platform: SocialProvider,
  config: Record<string, unknown> = {},
): readonly SocialPostConfigurationField[] {
  return SOCIAL_POST_CONFIGURATION_SCHEMA[platform].filter(
    (field) => !field.visibleWhen || field.visibleWhen(config),
  );
}

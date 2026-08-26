/**
 * Social Post Configuration — VALIDATION (Zod).
 *
 * The opt-in validation layer. Every platform is covered so nothing is a blind spot,
 * but the work is tiered:
 *   - The BASE schema for each platform is DERIVED from the UI metamodel
 *     (`social-post-configuration.schema`) — enum membership, types, and length caps
 *     (from `social-post-configuration.limits`) come across automatically, so the
 *     numbers can never drift from what the UI shows.
 *   - REFINEMENTS are hand-written only where the API actually REJECTS a combination:
 *     TikTok (branded-content ⊄ private, creator-info tiers), TikTok Business, X (poll
 *     2–4 options, poll ⊕ media), YouTube (publish_at ⇒ private). Everything the API
 *     merely IGNORES stays a UI-visibility concern in the schema, not an error here.
 *
 * Every object is LENIENT (`.catchall(z.unknown())`): the API stores configuration
 * verbatim and ignores unknown keys, so a forward-compatible payload (a field the API
 * added before the registry caught up) must pass, not be rejected. This is a
 * presentational, pre-submit check — the API remains the source of truth on rejection.
 *
 * Requires `zod`. Consumers who don't want a runtime dependency can use the schema and
 * limits directly; install this item only when you want the enforced rules.
 */

import { z } from "zod";

import type { SocialAccount, SocialProvider } from "~/lib/post-for-me.types";
import {
  PLATFORMS_REQUIRING_MEDIA,
  SOCIAL_POST_CONFIGURATION_LIMITS as LIMITS,
} from "~/lib/social-post-configuration.limits";
import {
  SOCIAL_POST_CONFIGURATION_SCHEMA,
  type SocialPostConfigurationField,
} from "~/lib/social-post-configuration.schema";
import type { SocialPostConfiguration } from "~/lib/social-post-configuration.types";

const PROVIDERS: readonly SocialProvider[] = [
  "instagram",
  "facebook",
  "threads",
  "tiktok",
  "tiktok_business",
  "x",
  "youtube",
  "pinterest",
  "linkedin",
  "bluesky",
];

/**
 * TikTok creator info (from the API's creator-info query), used to activate the
 * runtime privacy/interaction tiers. Optional everywhere — omit it and only the static
 * rules run.
 */
export interface TiktokCreatorInfo {
  /** Raw TikTok privacy enums the account may post, e.g. `PUBLIC_TO_EVERYONE`, `SELF_ONLY`. */
  privacy_level_options?: string[];
  comment_disabled?: boolean;
  duet_disabled?: boolean;
  stitch_disabled?: boolean;
  max_video_post_duration_sec?: number;
}

/** Maps our simplified privacy value onto the raw TikTok enum. */
const TIKTOK_PRIVACY_TO_RAW: Record<string, string> = {
  public: "PUBLIC_TO_EVERYONE",
  private: "SELF_ONLY",
};

/** X poll — its own schema so the 2–4 option / duration rules are enforced. */
const twitterPollSchema = z
  .object({
    duration_minutes: z
      .number()
      .min(LIMITS.x.poll.durationMinutesMin)
      .max(LIMITS.x.poll.durationMinutesMax),
    options: z
      .array(z.string().max(LIMITS.x.poll.optionMaxLength))
      .min(LIMITS.x.poll.minOptions)
      .max(LIMITS.x.poll.maxOptions),
    reply_settings: z
      .enum(["following", "mentionedUsers", "subscribers", "verified"])
      .optional(),
  })
  .catchall(z.unknown());

/** Turn one metamodel field into its Zod type (before `.optional()`). */
function fieldToZod(field: SocialPostConfigurationField): z.ZodTypeAny {
  switch (field.control) {
    case "switch":
      return z.boolean();
    case "number":
      return z.number();
    case "tags":
    case "board": {
      let arr = z.array(z.string());
      if (field.maxItems) arr = arr.max(field.maxItems);
      return arr;
    }
    case "segmented":
    case "select": {
      const values = (field.options ?? []).map((o) => o.value);
      return values.length
        ? z.enum(values as [string, ...string[]])
        : z.string();
    }
    case "poll":
      return twitterPollSchema;
    case "datetime":
      return z.string();
    case "text":
    case "textarea":
    default: {
      let str = z.string();
      if (field.maxLength) str = str.max(field.maxLength);
      return str;
    }
  }
}

/** Build the derived base object schema for a platform from its metamodel fields. */
function baseSchema(platform: SocialProvider) {
  // A mutable record (not `z.ZodRawShape`, which is readonly under zod 4) so this stays
  // forward-compatible for consumers on either zod 3 or 4.
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of SOCIAL_POST_CONFIGURATION_SCHEMA[platform]) {
    shape[field.key] = fieldToZod(field).optional();
  }
  // caption/media overrides and any forward-compatible keys pass through.
  return z.object(shape).catchall(z.unknown());
}

interface PlatformSchemaOptions {
  creatorInfo?: TiktokCreatorInfo;
}

/** Shared TikTok / TikTok Business refinements (both providers reject the same combos). */
function refineTiktok(base: z.ZodTypeAny, creator?: TiktokCreatorInfo) {
  return base.superRefine((value, ctx) => {
    const v = value as Record<string, unknown>;

    // TikTok requires an explicit visibility choice (no default).
    if (!v.privacy_status) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["privacy_status"],
        message: "Choose who can view this video.",
      });
    }

    if (v.disclose_branded_content === true && v.privacy_status === "private") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["privacy_status"],
        message: "Branded content can't be posted privately on TikTok.",
      });
    }

    if (!creator) return;

    if (creator.privacy_level_options && typeof v.privacy_status === "string") {
      const raw = TIKTOK_PRIVACY_TO_RAW[v.privacy_status];
      if (raw && !creator.privacy_level_options.includes(raw)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["privacy_status"],
          message: `This account can't post ${v.privacy_status} content.`,
        });
      }
    }
    // Interactions default ON, so a missing value still conflicts with a disabled setting.
    if (creator.comment_disabled && v.allow_comment !== false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allow_comment"],
        message: "This account has comments turned off.",
      });
    }
    if (creator.duet_disabled && v.allow_duet !== false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allow_duet"],
        message: "This account has duets turned off.",
      });
    }
    if (creator.stitch_disabled && v.allow_stitch !== false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allow_stitch"],
        message: "This account has stitch turned off.",
      });
    }
  });
}

function refineYoutube(base: z.ZodTypeAny) {
  return base.superRefine((value, ctx) => {
    const v = value as Record<string, unknown>;
    // YouTube won't publish a video without a title.
    if (!v.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["title"],
        message: "YouTube requires a title.",
      });
    }
    if (v.publish_at && v.privacy_status !== "private") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["publish_at"],
        message: "Scheduling with publish_at requires Private visibility.",
      });
    }
  });
}

function refineTwitter(base: z.ZodTypeAny) {
  return base.superRefine((value, ctx) => {
    const v = value as Record<string, unknown>;
    const hasPoll = v.poll != null;
    const hasMedia = Array.isArray(v.media) && v.media.length > 0;
    if (hasPoll && hasMedia) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["poll"],
        message: "A poll can't be combined with media on X.",
      });
    }
  });
}

/** Resolve the full Zod schema for one platform, with optional runtime context. */
export function getPlatformConfigurationSchema(
  platform: SocialProvider,
  options: PlatformSchemaOptions = {},
): z.ZodTypeAny {
  const base = baseSchema(platform);
  switch (platform) {
    case "tiktok":
    case "tiktok_business":
      return refineTiktok(base, options.creatorInfo);
    case "youtube":
      return refineYoutube(base);
    case "x":
      return refineTwitter(base);
    default:
      return base;
  }
}

/** TikTok configuration schema — pass creator info to enable the runtime tiers. */
export const tiktokConfigurationSchema = (creatorInfo?: TiktokCreatorInfo) =>
  getPlatformConfigurationSchema("tiktok", { creatorInfo });

/** TikTok Business configuration schema. */
export const tiktokBusinessConfigurationSchema = (
  creatorInfo?: TiktokCreatorInfo,
) => getPlatformConfigurationSchema("tiktok_business", { creatorInfo });

/** YouTube configuration schema. */
export const youtubeConfigurationSchema = getPlatformConfigurationSchema("youtube");

/** X (Twitter) configuration schema. */
export const twitterConfigurationSchema = getPlatformConfigurationSchema("x");

/**
 * A structural schema for a whole `SocialPostConfiguration` value — validates each
 * `platform_configurations` entry against its platform schema (static rules only; no
 * account context). Drop-in for a form `zodResolver` when you only use the platform
 * tier. For account-aware and creator-info-aware checks, use
 * `validateSocialPostConfiguration`.
 */
export const socialPostConfigurationSchema = z
  .object({
    platform_configurations: z
      .object(
        Object.fromEntries(
          PROVIDERS.map((p) => [p, getPlatformConfigurationSchema(p).optional()]),
        ) as z.ZodRawShape,
      )
      .catchall(z.unknown())
      .optional(),
    account_configurations: z
      .array(
        z.object({
          social_account_id: z.string(),
          configuration: z.record(z.string(), z.unknown()),
        }),
      )
      .optional(),
  })
  .catchall(z.unknown());

export interface SocialPostConfigurationIssue {
  scope: "platform" | "account";
  platform: SocialProvider;
  accountId?: string;
  path: (string | number)[];
  message: string;
}

export interface SocialPostConfigurationValidationResult {
  valid: boolean;
  issues: SocialPostConfigurationIssue[];
}

export interface ValidateSocialPostConfigurationOptions {
  /** Connected accounts, so `account_configurations` can be routed to the right platform. */
  accounts?: SocialAccount[];
  /** TikTok creator info keyed by `social_account_id`, to enable the runtime tiers. */
  creatorInfo?: Record<string, TiktokCreatorInfo>;
}

/**
 * Validate a whole configuration value, account-aware. Each `platform_configurations`
 * entry is checked with static rules; each `account_configurations` entry is routed to
 * its account's platform and checked with that account's creator info when supplied.
 * Account entries whose account isn't in `accounts` are skipped (platform unknown).
 */
export function validateSocialPostConfiguration(
  value: SocialPostConfiguration,
  options: ValidateSocialPostConfigurationOptions = {},
): SocialPostConfigurationValidationResult {
  const issues: SocialPostConfigurationIssue[] = [];

  const platformConfigs = value.platform_configurations ?? {};
  for (const key of Object.keys(platformConfigs) as SocialProvider[]) {
    const config = platformConfigs[key];
    if (config == null) continue;
    const result = getPlatformConfigurationSchema(key).safeParse(config);
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push({
          scope: "platform",
          platform: key,
          // zod 4 types `issue.path` as `PropertyKey[]` (may include symbols); config
          // paths are only string/number, so narrow it for both zod 3 and 4 consumers.
          path: issue.path as (string | number)[],
          message: issue.message,
        });
      }
    }
  }

  const accountsById = new Map(
    (options.accounts ?? []).map((account) => [account.id, account]),
  );
  for (const entry of value.account_configurations ?? []) {
    const account = accountsById.get(entry.social_account_id);
    if (!account) continue;
    const schema = getPlatformConfigurationSchema(account.platform, {
      creatorInfo: options.creatorInfo?.[entry.social_account_id],
    });
    const result = schema.safeParse(entry.configuration);
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push({
          scope: "account",
          platform: account.platform,
          accountId: entry.social_account_id,
          path: issue.path as (string | number)[],
          message: issue.message,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

// --- whole-post validation ----------------------------------------------------------------

/** A media tag as validated — structural (matches the composer's media tag). */
interface MediaTagInput {
  platform?: string | null;
  type?: string | null;
  x?: number | null;
  y?: number | null;
}

/** One media item as whole-post validation sees it. `url` is optional — media uploads at
 * publish time, so this is safe to run pre-upload. */
interface MediaInput {
  url?: string | null;
  tags?: MediaTagInput[] | null;
}

/** The whole post to validate — a structural subset of the composer draft. */
export interface ValidateSocialPostInput {
  socialAccounts?: string[];
  /** The base caption. Any string is valid (empty allowed); only its presence gates content. */
  caption?: string;
  media?: MediaInput[];
  /** ISO-8601 publish time, or null to publish now. */
  scheduledAt?: string | null;
  configuration?: SocialPostConfiguration;
}

/** One issue from whole-post validation; `scope` says which part of the post it concerns. */
export interface SocialPostIssue {
  scope: "schedule" | "media" | "platform" | "account";
  platform?: SocialProvider;
  accountId?: string;
  path?: (string | number)[];
  message: string;
}

export interface SocialPostValidationResult {
  valid: boolean;
  issues: SocialPostIssue[];
}

export interface ValidateSocialPostOptions
  extends ValidateSocialPostConfigurationOptions {
  /** "Now" for the future-schedule check (injectable for tests). Defaults to the current time. */
  now?: Date;
}

const MEDIA_TAG_PLATFORMS = new Set(["facebook", "instagram"]);
const MEDIA_TAG_TYPES = new Set(["product", "user"]);

/**
 * Validate a WHOLE social post — not just its per-platform config: a schedule that must be a
 * future instant, the platforms that reject text-only posts (media required), media tag shape
 * (IG/FB only, `user`/`product`, 0–100 coordinates), and the configuration (delegated to
 * {@link validateSocialPostConfiguration}). `url` is intentionally NOT required — media uploads
 * at publish time — so this is safe to run pre-upload as the Publish gate. Caption is a string
 * (empty allowed), so it is never invalid here; "no content at all" is a composer-gate concern.
 */
export function validateSocialPost(
  input: ValidateSocialPostInput,
  options: ValidateSocialPostOptions = {},
): SocialPostValidationResult {
  const issues: SocialPostIssue[] = [];
  const now = options.now ?? new Date();

  // Schedule: if set, a valid instant strictly in the future.
  if (input.scheduledAt) {
    const time = new Date(input.scheduledAt).getTime();
    if (Number.isNaN(time)) {
      issues.push({ scope: "schedule", message: "Scheduled time is not a valid date." });
    } else if (time <= now.getTime()) {
      issues.push({
        scope: "schedule",
        message: "Scheduled time must be in the future.",
      });
    }
  }

  // Media tag shape (IG/FB only, user/product, 0–100 coordinates).
  (input.media ?? []).forEach((item, index) => {
    (item.tags ?? []).forEach((tag, tagIndex) => {
      if (tag.platform != null && !MEDIA_TAG_PLATFORMS.has(tag.platform)) {
        issues.push({
          scope: "media",
          path: [index, "tags", tagIndex, "platform"],
          message: "Media tags are only supported on Facebook and Instagram.",
        });
      }
      if (tag.type != null && !MEDIA_TAG_TYPES.has(tag.type)) {
        issues.push({
          scope: "media",
          path: [index, "tags", tagIndex, "type"],
          message: 'Tag type must be "user" or "product".',
        });
      }
      for (const axis of ["x", "y"] as const) {
        const value = tag[axis];
        if (value != null && (value < 0 || value > 100)) {
          issues.push({
            scope: "media",
            path: [index, "tags", tagIndex, axis],
            message: `Tag ${axis} must be between 0 and 100.`,
          });
        }
      }
    });
  });

  // Media required by platform (base media satisfies every target; else a per-platform or
  // per-account media override for that platform must supply it).
  const accountsById = new Map(
    (options.accounts ?? []).map((account) => [account.id, account]),
  );
  const targetedPlatforms = new Set<SocialProvider>();
  for (const id of input.socialAccounts ?? []) {
    const account = accountsById.get(id);
    if (account) targetedPlatforms.add(account.platform);
  }
  const baseMediaCount = input.media?.length ?? 0;
  const platformConfigs = input.configuration?.platform_configurations ?? {};
  const accountConfigs = input.configuration?.account_configurations ?? [];
  for (const platform of PLATFORMS_REQUIRING_MEDIA) {
    if (!targetedPlatforms.has(platform)) continue;
    const platformMedia =
      (platformConfigs[platform] as { media?: unknown[] } | undefined)?.media
        ?.length ?? 0;
    const accountMedia = accountConfigs.some((entry) => {
      const account = accountsById.get(entry.social_account_id);
      const media = (entry.configuration as { media?: unknown[] }).media;
      return account?.platform === platform && (media?.length ?? 0) > 0;
    });
    if (baseMediaCount === 0 && platformMedia === 0 && !accountMedia) {
      issues.push({
        scope: "platform",
        platform,
        message: `${platform} requires at least one media item.`,
      });
    }
  }

  // Delegate the per-platform configuration validation.
  if (input.configuration) {
    for (const issue of validateSocialPostConfiguration(
      input.configuration,
      options,
    ).issues) {
      issues.push({
        scope: issue.scope,
        platform: issue.platform,
        accountId: issue.accountId,
        path: issue.path,
        message: issue.message,
      });
    }
  }

  return { valid: issues.length === 0, issues };
}

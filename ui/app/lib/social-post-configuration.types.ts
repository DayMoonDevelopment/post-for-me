/**
 * Social Post Configuration — VALUE types, sourced from the `post-for-me` SDK.
 *
 * These are TYPE-ONLY re-exports of the SDK's own request/response shapes, so the
 * configuration our UI produces always matches the real API and we never maintain a
 * parallel copy. `import type` is erased at build — the SDK's runtime code never ships
 * to the client. Validation rules live in `social-post-configuration.validation`
 * (custom Zod); the SHAPES live here.
 *
 * The aggregate types are DERIVED from the two top-level exports (`CreateSocialPost`,
 * `PlatformConfigurationsDto`) rather than named sub-types, so they resolve regardless
 * of which helper types a given SDK version re-exports.
 */

import type { PostForMe } from "post-for-me";

/**
 * The configuration a social post carries — the two config fields on the create-post
 * body, so a value round-trips to `socialPosts.create` with no adapter in between.
 */
export type SocialPostConfiguration = Pick<
  PostForMe.CreateSocialPost,
  "platform_configurations" | "account_configurations"
>;

/** `platform_configurations` — one optional entry per provider (key = provider id). */
export type PlatformConfigurationMap = PostForMe.PlatformConfigurationsDto;

/** One account's override entry: `{ social_account_id, configuration }`. */
export type AccountConfiguration = NonNullable<
  PostForMe.CreateSocialPost["account_configurations"]
>[number];

/** The per-platform configuration union (Instagram | TikTok | Pinterest | …). */
export type PlatformConfiguration = NonNullable<
  PlatformConfigurationMap[keyof PlatformConfigurationMap]
>;

/** A media override, exactly as the SDK models it. */
export type SocialPostConfigurationMedia = NonNullable<
  PostForMe.PinterestConfigurationDto["media"]
>[number];

// Per-platform configuration shapes, straight from the SDK.
export type InstagramConfiguration = PostForMe.InstagramConfigurationDto;
export type FacebookConfiguration = PostForMe.FacebookConfigurationDto;
export type ThreadsConfiguration = PostForMe.ThreadsConfigurationDto;
export type TiktokConfiguration = PostForMe.TiktokConfiguration;
export type TwitterConfiguration = PostForMe.TwitterConfigurationDto;
export type YoutubeConfiguration = PostForMe.YoutubeConfigurationDto;
export type PinterestConfiguration = PostForMe.PinterestConfigurationDto;
export type LinkedinConfiguration = PostForMe.LinkedinConfigurationDto;
export type BlueskyConfiguration = PostForMe.BlueskyConfigurationDto;

/**
 * A Post for Me social post — the shape `socialPosts.create` / `.retrieve` / `.update`
 * return. On the response, `social_accounts` is an array of full account objects (not
 * ids) and it carries `platform_configurations` + `account_configurations`, so it's a
 * complete, self-contained input for rendering a preview.
 */
export type SocialPost = PostForMe.SocialPost;

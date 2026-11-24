import type { PostForMe } from "post-for-me";

/**
 * The social providers the API returns, sourced directly from the `post-for-me` SDK's
 * `PlatformConfigurationsDto` keys so it can never drift from the API. This is a
 * TYPE-ONLY import — the SDK's runtime code is erased at build and never ships to the
 * client. `tiktok_business` is a DISTINCT provider (its own API + auth tokens) that
 * happens to reuse the TikTok mark. Instagram is always `instagram` — authenticating
 * via Facebook is a dev auth-config choice at connect time, NOT a provider type, so
 * there is no `instagram_w_facebook` key.
 */
export type SocialProvider = keyof PostForMe.PlatformConfigurationsDto;

/**
 * A connected social account, as the API returns it (trimmed to what UI needs).
 * `platform` drives the brand mark; `username` is the handle; `displayName` and
 * `avatarUrl` are optional profile details for a richer chip. Components that render
 * accounts (Account Selector, User Badge blocks) take this shape.
 */
export type SocialAccount = {
  avatarUrl?: string | null;
  displayName?: string | null;
  id: string;
  platform: SocialProvider;
  username: string;
};

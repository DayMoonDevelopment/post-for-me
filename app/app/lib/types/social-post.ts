import type { SocialProvider } from "~/lib/onboarding";

import {
  DEFAULT_PAGE_SIZE,
  isSocialPostStatus,
  SOCIAL_POST_STATUSES,
  type SocialPostStatus,
} from "~/lib/types/social-account";

// Re-export the shared post-status vocabulary so post consumers import it from
// the post module, even though it's physically defined alongside the account
// types (where `AccountPost` first needed it).
export {
  DEFAULT_PAGE_SIZE,
  isSocialPostStatus,
  SOCIAL_POST_STATUSES,
  type SocialPostStatus,
};

/**
 * A post's outcome **for one targeted account**, derived per-account — never a
 * stored column. From the post's `social_post_results` row for that connection:
 * `success` → success, `success=false` → error; with **no result row yet** (the
 * post is still draft/scheduled/processing) it reads `pending`. The single
 * tri-state the account avatar's status dot implies. */
export type PostAccountStatus = "pending" | "success" | "error";

/** The identity of an account a post targets — a slim projection of a
 * `social_provider_connections` row, enough to render an avatar + tooltip. */
export interface PostAccountIdentity {
  avatarUrl: string | null;
  /** The caller's own correlation id for the connection, if set. */
  externalId: string | null;
  /** The Post for Me connection id (PFM ID). */
  id: string;
  platform: SocialProvider;
  username: string | null;
}

/** A targeted account on a post, plus its per-account {@link PostAccountStatus}. */
export interface PostAccount {
  account: PostAccountIdentity;
  status: PostAccountStatus;
}

/**
 * A social post, owned by a project. App-native DTO over a `social-posts` list
 * row + its targeted accounts. The list grid renders exactly this; the detail
 * page uses the richer {@link SocialPostDetail}.
 *
 * The list endpoint carries NO per-account result outcome, so a post's
 * `accounts` are bare {@link PostAccountIdentity} rows (identity only) — the
 * per-account success/error badge lives on the detail page's
 * {@link PostAccountResult}, where the results endpoint is fetched.
 *
 * The two ids are distinct and both surfaced as copyable values:
 * - `id` — the Post for Me post id (PFM ID).
 * - `externalId` — the caller's own correlation id, if they set one.
 */
export interface SocialPost {
  accounts: PostAccountIdentity[];
  caption: string;
  externalId: string | null;
  /** Whether the post carries any media — drives the caption's media/text-only
   * leading indicator (the gallery itself is only loaded for the detail page). */
  hasMedia: boolean;
  id: string;
  /** `post_at` — when the post is/was scheduled to publish (ISO-8601). */
  postAt: string;
  status: SocialPostStatus;
}

/** A single media attachment on a post (image/video). Media is a transient URL
 * (it may no longer resolve), so the UI shows it as a URL, not an asset. */
export interface PostMedia {
  thumbnailUrl: string | null;
  url: string;
}

/** The cascade layer that set a field for an account: a platform-wide override or
 * an account-specific one (account wins over platform; both win over the base). */
export type ConfigScope = "platform" | "account";

/**
 * One field whose **resolved** value (after collapsing global → platform →
 * account) differs from the post's global base — i.e. a real override to call
 * out. `field` is `caption`, `media`, or a platform-config key (e.g. `placement`);
 * `scope` is the layer that won the value; `value` is the resolved value rendered
 * for display (already stringified). Computed per account; only diffs are kept.
 */
export interface PostAccountOverride {
  field: string;
  scope: ConfigScope;
  value: string;
}

/**
 * A targeted account on the **detail** page: its identity + per-account status,
 * the cascade **overrides** it carries off the base (for the roster's delta hint),
 * its **result id** (link to the standalone result page once processed), and the
 * result fields. Extends {@link PostAccount}.
 */
export interface PostAccountResult extends PostAccount {
  errorMessage: string | null;
  /** Fields this account overrides off the base, with the layer they came from. */
  overrides: PostAccountOverride[];
  providerPostId: string | null;
  providerPostUrl: string | null;
  /** The `social_post_results` id — present once processed; the result page link. */
  resultId: string | null;
}

/**
 * The full post for the detail page: the {@link SocialPost} fields plus media,
 * `createdAt`, and the per-account results.
 */
export interface SocialPostDetail {
  accounts: PostAccountResult[];
  caption: string;
  createdAt: string;
  externalId: string | null;
  id: string;
  media: PostMedia[];
  postAt: string;
  /** The owning project's id — the back link + sidebar active-project resolver. */
  projectId: string;
  status: SocialPostStatus;
}

/**
 * Everything the list page reads off the URL and hands to
 * {@link SocialPostsService.list}. All optional — an absent key means "no
 * constraint" / a default. The API list has no fuzzy search or sort: the filters
 * are the platform/status chips plus two exact-match lookups (`externalId` —
 * the post's own correlation id; `socialAccountId` — a targeted account's PFM id).
 */
export interface SocialPostListParams {
  /** Exact-match on the post's own `external_id` correlation id. */
  externalId?: string;
  page?: number;
  pageSize?: number;
  /** Posts targeting at least one account on any of these platforms. */
  platform?: SocialProvider[];
  /** Exact-match on a targeted account's PFM id (`social_account_id`). */
  socialAccountId?: string;
  status?: SocialPostStatus[];
}

/** A page of posts plus the totals the grid needs to render pagination. */
export interface SocialPostListResult {
  page: number;
  pageSize: number;
  posts: SocialPost[];
  total: number;
}

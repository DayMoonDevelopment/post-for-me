import type { SocialProvider } from "~/lib/onboarding";

/**
 * Connection health, *derived* — never a stored column. A row carries tokens
 * (or not) and an expiry; the status is computed from them so the UI has a
 * single tri-state to imply on the avatar dot (see {@link deriveStatus}).
 *
 * `connected` (success) = an access token that hasn't expired ·
 * `expired` (warning) = an access token past its `access_token_expires_at` ·
 * `disconnected` (muted) = no access token (e.g. after an explicit disconnect).
 */
export type SocialAccountStatus = "connected" | "expired" | "disconnected";

export const SOCIAL_ACCOUNT_STATUSES = [
  "connected",
  "expired",
  "disconnected",
] as const;

export function isSocialAccountStatus(
  value: unknown,
): value is SocialAccountStatus {
  return (
    typeof value === "string" &&
    (SOCIAL_ACCOUNT_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * A connected social account, owned by a project. App-native DTO over a
 * `social_provider_connections` row — **never carries tokens** (those are
 * fetched explicitly via {@link SocialAccountsService.getTokens} for the
 * detail page's opt-in reveal).
 *
 * The three ids are deliberately distinct and all surfaced as copyable values:
 * - `id` — the Post for Me connection id (PFM ID).
 * - `platformId` — the account's id *on the provider* (`social_provider_user_id`).
 * - `externalId` — the caller's own correlation id, if they set one.
 */
export interface SocialAccount {
  avatarUrl: string | null;
  /** `created_at` — when the connection was first established (ISO-8601). Null
   * for API-sourced accounts (the API returns no timestamp). */
  connectedAt: string | null;
  externalId: string | null;
  id: string;
  platform: SocialProvider;
  platformId: string;
  /** The owning project's id — the back link + post-delete redirect target. */
  projectId: string;
  status: SocialAccountStatus;
  username: string | null;
}

/**
 * The opt-in token bundle, returned only by an explicit
 * {@link SocialAccountsService.getTokens} call (the detail page's masked
 * reveal). Allowed because the user can retrieve these via the API — this is
 * NOT the app-credentials secret invariant.
 */
export interface SocialAccountTokens {
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: string | null;
}

/**
 * NON-SECRET token metadata, safe to fold into the detail loader (the document):
 * the expiry instants — which aren't secret — plus a boolean of whether each
 * token exists. The token VALUES are deliberately absent; they're fetched on an
 * explicit user action via {@link SocialAccountsService.getTokens}. The detail
 * page renders the expiry dates immediately from this, and uses the booleans to
 * gate whether a reveal/copy affordance is shown per token.
 */
export interface SocialAccountTokenMeta {
  accessTokenExpiresAt: string | null;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  refreshTokenExpiresAt: string | null;
}

/**
 * A post's lifecycle status — the API's `PostStatus` (`draft | scheduled |
 * processing | processed`). The social post is the *intent/config*; whether each
 * targeted account actually published lives in the per-account results, not here.
 * (The DB enum still carries a legacy `posted` value the API no longer uses; it's
 * normalized to `processed` at the service boundary.)
 */
export type SocialPostStatus =
  | "draft"
  | "scheduled"
  | "processing"
  | "processed";

export const SOCIAL_POST_STATUSES = [
  "draft",
  "scheduled",
  "processing",
  "processed",
] as const;

export function isSocialPostStatus(value: unknown): value is SocialPostStatus {
  return (
    typeof value === "string" &&
    (SOCIAL_POST_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * A minimal post summary for the account detail page's "posts from this account"
 * table — just enough to list + link to `/social-posts/$id`. (A fuller post DTO
 * lands with the Social Posts service, PFM-698.)
 */
export interface AccountPost {
  caption: string;
  id: string;
  postAt: string;
  status: SocialPostStatus;
}

/** Server-driven sort. The grid header toggles these via URL params. */
export type SocialAccountSortField = "username" | "platform" | "connectedAt";
export type SortDirection = "asc" | "desc";

export interface SocialAccountSort {
  direction: SortDirection;
  field: SocialAccountSortField;
}

/**
 * Everything the list page reads off the URL and hands to
 * {@link SocialAccountsService.list}. All optional — an absent key means "no
 * constraint" / a default. Search is an ILIKE across username + the platform &
 * external ids; `platform`/`status` are the Linear-style filter chips.
 */
export interface SocialAccountListParams {
  /** Exact-match filter on the caller's correlation id (API `external_id`). */
  externalId?: string;
  page?: number;
  pageSize?: number;
  platform?: SocialProvider[];
  /** @deprecated Fuzzy search isn't supported by the API; use exact-match
   * {@link SocialAccountListParams.username}/`externalId`. Retained until the
   * list UI is migrated off it. */
  search?: string;
  /** @deprecated The API list has no sort; retained until the UI is migrated. */
  sort?: SocialAccountSort;
  status?: SocialAccountStatus[];
  /** Exact-match filter on the account's platform username (API `username`). */
  username?: string;
}

/** A page of accounts plus the totals the grid needs to render pagination. */
export interface SocialAccountListResult {
  accounts: SocialAccount[];
  page: number;
  pageSize: number;
  total: number;
}

export const DEFAULT_PAGE_SIZE = 25;

/**
 * The single place connection health is decided, shared by every read so the
 * list grid and the detail page can't disagree. Pure: pass the row's token +
 * expiry and the reference instant.
 */
export function deriveStatus(
  accessToken: string | null,
  accessTokenExpiresAt: string | null,
  now: Date = new Date(),
): SocialAccountStatus {
  if (!accessToken) return "disconnected";
  if (accessTokenExpiresAt && new Date(accessTokenExpiresAt) <= now) {
    return "expired";
  }
  return "connected";
}

import type { ApiClient } from "~/lib/.server/api/client";
import type { SocialProvider } from "~/lib/onboarding";
import type { SocialPostConfiguration } from "~/lib/social-post-configuration.types";
import type {
  ConfigScope,
  PostAccountIdentity,
  PostAccountOverride,
  PostAccountResult,
  PostAccountStatus,
  PostMedia,
  SocialPost,
  SocialPostDetail,
  SocialPostListParams,
  SocialPostListResult,
  SocialPostStatus,
} from "~/lib/types/social-post";

import { isSocialProvider } from "~/lib/onboarding";
import { DEFAULT_PAGE_SIZE } from "~/lib/types/social-account";

import type { SocialPostsService } from "./social-posts.service";

/** A media attachment as the API returns it (`social-posts` / config `media`).
 * Note it carries only a `url` — no thumbnail — so `thumbnailUrl` is always null
 * for API rows. */
interface ApiPostMedia {
  url: string;
}

/** The API's flat per-target configuration (`configuration` on an account config,
 * or a value in `platform_configurations`). `caption`/`media` are the base
 * overrides; every other key is a platform-specific option (placement, title…).
 * Typed loosely because the extra keys vary by platform. */
interface ApiConfiguration {
  [key: string]: unknown;
  caption?: null | string;
  media?: ApiPostMedia[] | null;
}

/** The account identity slice of `social_accounts` on a `social-posts` payload. */
interface ApiPostAccount {
  external_id: null | string;
  id: string;
  platform: string;
  profile_photo_url: null | string;
  username: null | string;
}

/** A `GET /v1/social-posts` list row. The list endpoint returns NO per-account
 * result and NO `created_at`, so the list DTO trims both (they live on detail). */
interface ApiSocialPostListItem {
  caption: null | string;
  external_id: null | string;
  id: string;
  media: ApiPostMedia[] | null;
  scheduled_at: null | string;
  social_accounts: ApiPostAccount[];
  status: string;
}

/** `GET /v1/social-posts/:id` — the full post: the list fields plus the cascade
 * (`platform_configurations` keyed by platform, `account_configurations` scoped
 * by `social_account_id`) and `created_at`. */
interface ApiSocialPost extends ApiSocialPostListItem {
  account_configurations:
    | { configuration: ApiConfiguration; social_account_id: string }[]
    | null;
  created_at: string;
  platform_configurations: Record<string, ApiConfiguration> | null;
}

/** A `GET /v1/social-post-results?post_id=:id` row — one account's outcome. */
interface ApiSocialPostResult {
  error: unknown;
  id: string;
  platform_data: { id?: null | string; url?: null | string } | null;
  social_account_id: string;
  success: boolean;
}

interface ApiListResponse<T> {
  data: T[];
  meta: { limit: number; next: null | string; offset: number; total: number };
}

function appendAll(query: URLSearchParams, key: string, values: string[]): void {
  for (const value of values) query.append(key, value);
}

function toIdentity(account: ApiPostAccount): PostAccountIdentity {
  return {
    id: account.id,
    externalId: account.external_id,
    platform: (isSocialProvider(account.platform)
      ? account.platform
      : account.platform) as SocialProvider,
    username: account.username,
    avatarUrl: account.profile_photo_url,
  };
}

/**
 * One account's outcome from its (possibly absent) result: a result present →
 * success/error by its flag; none yet → pending. The single place the per-account
 * tri-state is decided — mirrors the Supabase adapter. Only the detail read has
 * results; the list carries identity only.
 */
function derivePostAccountStatus(
  success: boolean | undefined,
): PostAccountStatus {
  if (success === undefined) return "pending";
  return success ? "success" : "error";
}

/** Coerce the untyped `error` payload to a display string (null = no error). */
function toErrorMessage(error: unknown): null | string {
  if (error == null) return null;
  if (typeof error === "string") return error.trim() === "" ? null : error;
  return JSON.stringify(error);
}

/** Render a `provider_data` value as a display string (null = nothing to show).
 * Mirrors the Supabase adapter so overrides read identically across backends. */
function formatConfigValue(value: unknown): null | string {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() === "" ? null : value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const parts = value
      .map((v) =>
        typeof v === "string" || typeof v === "number"
          ? String(v)
          : JSON.stringify(v),
      )
      .filter((s) => s.trim() !== "");
    return parts.length ? parts.join(", ") : null;
  }
  return JSON.stringify(value);
}

/**
 * Collapse the cascade (global → platform → account, account winning) for one
 * account and return only the fields whose **resolved** value differs from the
 * post's global base — each with the layer that won it and the resolved value.
 * Ported 1:1 from the Supabase adapter's `computeOverrides`; the only difference
 * is the source shape — the platform layer is `platform_configurations[platform]`
 * and the account layer is the account's `configuration` object (both flat:
 * `caption`/`media` + platform keys).
 *
 * - `caption`: resolved caption vs `baseCaption` (the post's global caption).
 * - `media`: any platform/account-scoped media is an override (base is global-only).
 * - the rest: `provider_data` keys (e.g. `placement`); the base carries none, so
 *   any present value is a diff. Account value wins the platform value.
 */
function computeOverrides(
  baseCaption: string,
  platformCfg: ApiConfiguration | undefined,
  accountCfg: ApiConfiguration | undefined,
): PostAccountOverride[] {
  const overrides: PostAccountOverride[] = [];

  // Caption — resolve account over platform, then diff against the global base.
  const resolvedCaption = accountCfg?.caption ?? platformCfg?.caption ?? null;
  if (resolvedCaption != null && resolvedCaption !== baseCaption) {
    const scope: ConfigScope =
      accountCfg?.caption != null ? "account" : "platform";
    overrides.push({ field: "caption", scope, value: resolvedCaption });
  }

  // provider_data fields — base has none, so any resolved value is an override.
  const platformData = platformCfg ?? {};
  const accountData = accountCfg ?? {};
  const keys = new Set<string>();
  for (const key of [...Object.keys(platformData), ...Object.keys(accountData)]) {
    if (key !== "caption" && key !== "media") keys.add(key);
  }
  for (const key of keys) {
    const fromAccount = key in accountData;
    const value = formatConfigValue(
      fromAccount ? accountData[key] : platformData[key],
    );
    if (value != null) {
      overrides.push({
        field: key,
        scope: fromAccount ? "account" : "platform",
        value,
      });
    }
  }

  // Media — any scoped media row (account winning platform) is an override.
  const accountMedia = accountCfg?.media ?? [];
  const platformMedia = platformCfg?.media ?? [];
  const scopedMedia = accountMedia.length ? accountMedia : platformMedia;
  if (scopedMedia.length) {
    overrides.push({
      field: "media",
      scope: accountMedia.length ? "account" : "platform",
      value: scopedMedia.map((m) => m.url).join("\n"),
    });
  }

  return overrides;
}

function toSocialPost(row: ApiSocialPostListItem): SocialPost {
  return {
    id: row.id,
    externalId: row.external_id,
    postAt: row.scheduled_at ?? "",
    // The API status is already the current vocabulary (no legacy `posted`).
    status: row.status as SocialPostStatus,
    caption: row.caption ?? "",
    hasMedia: (row.media?.length ?? 0) > 0,
    // The list has no per-account result, so accounts carry identity only.
    accounts: row.social_accounts.map(toIdentity),
  };
}

/**
 * API-backed {@link SocialPostsService}, bound to a single project (the temp key
 * scopes every call, so the DTO's `projectId` is stamped from here). The only
 * code that knows the `/v1/social-posts` wire shape.
 *
 * `list` is a single offset/limit query with exact-match `platform`/`status`/
 * `external_id`/`social_account_id` filters; the API has no fuzzy search or sort.
 *
 * `get` makes TWO calls (there is deliberately no `expand` on results): the post
 * (for media + cascade + account identity + status) and its results (for the
 * per-account outcomes). The two are joined by `social_account_id`.
 */
export function createApiSocialPostsService(
  client: ApiClient,
  projectId: string,
): SocialPostsService {
  return {
    async list(_projectId, params = {}): Promise<SocialPostListResult> {
      const page = Math.max(1, params.page ?? 1);
      const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
      const query = new URLSearchParams();
      query.set("limit", String(pageSize));
      query.set("offset", String((page - 1) * pageSize));
      if (params.platform?.length) appendAll(query, "platform", params.platform);
      if (params.status?.length) appendAll(query, "status", params.status);
      if (params.externalId) query.append("external_id", params.externalId);
      if (params.socialAccountId) {
        query.append("social_account_id", params.socialAccountId);
      }

      const response = await client.get<ApiListResponse<ApiSocialPostListItem>>(
        `/v1/social-posts?${query.toString()}`,
      );
      return {
        posts: response.data.map(toSocialPost),
        total: response.meta.total,
        page,
        pageSize,
      };
    },

    async get(id): Promise<SocialPostDetail> {
      const post = await client.get<ApiSocialPost>(`/v1/social-posts/${id}`);
      const resultsResponse = await client.get<
        ApiListResponse<ApiSocialPostResult>
      >(`/v1/social-post-results?post_id=${id}`);

      // The global caption is the cascade base; normalize null → "" once.
      const baseCaption = post.caption ?? "";

      const resultByAccount = new Map<string, ApiSocialPostResult>(
        resultsResponse.data.map((r) => [r.social_account_id, r]),
      );

      const accounts: PostAccountResult[] = post.social_accounts.map(
        (account) => {
          const result = resultByAccount.get(account.id);
          const platformCfg = post.platform_configurations?.[account.platform];
          const accountCfg = post.account_configurations?.find(
            (c) => c.social_account_id === account.id,
          )?.configuration;
          return {
            account: toIdentity(account),
            status: derivePostAccountStatus(result?.success),
            resultId: result?.id ?? null,
            overrides: computeOverrides(baseCaption, platformCfg, accountCfg),
            errorMessage: toErrorMessage(result?.error),
            providerPostUrl: result?.platform_data?.url ?? null,
            providerPostId: result?.platform_data?.id ?? null,
          };
        },
      );

      // BASE media only — the global rows off the post. Scoped media live in the
      // configs and surface per account as overrides. Dedupe by url. The API's
      // media has no thumbnail, so `thumbnailUrl` is always null.
      const mediaByUrl = new Map<string, PostMedia>();
      for (const media of post.media ?? []) {
        if (!mediaByUrl.has(media.url)) {
          mediaByUrl.set(media.url, { url: media.url, thumbnailUrl: null });
        }
      }

      return {
        id,
        projectId,
        externalId: post.external_id,
        postAt: post.scheduled_at ?? "",
        createdAt: post.created_at,
        // The API status is already the current vocabulary (no legacy `posted`).
        status: post.status as SocialPostStatus,
        caption: baseCaption,
        media: [...mediaByUrl.values()],
        accounts,
      };
    },
  };
}

/** The fields the Playground assembles for a create. Already API-shaped — the
 * `configuration` slice is the registry's `platform_configurations` +
 * `account_configurations`, so it spreads straight into the wire body. */
export interface CreateSocialPostInput {
  caption: string;
  configuration: SocialPostConfiguration;
  isDraft: boolean;
  media: { url: string }[];
  /** ISO-8601 publish time, or null to publish immediately. */
  scheduledAt: string | null;
  socialAccounts: string[];
}

/**
 * The WRITE half of the social-posts port — `POST /v1/social-posts`. Kept separate
 * from the read-only {@link SocialPostsService} so authoring surfaces (the Playground)
 * depend only on `create`. `isDraft` is the top-level camelCase flag the API expects
 * (distinct from the per-account snake_case `is_draft`).
 */
export function createApiSocialPostWriter(client: ApiClient) {
  return {
    async create(input: CreateSocialPostInput): Promise<{ id: string }> {
      const created = await client.post<{ id: string }>("/v1/social-posts", {
        caption: input.caption,
        social_accounts: input.socialAccounts,
        media: input.media.length > 0 ? input.media : undefined,
        scheduled_at: input.scheduledAt ?? undefined,
        isDraft: input.isDraft,
        ...input.configuration,
      });
      return { id: created.id };
    },
  };
}

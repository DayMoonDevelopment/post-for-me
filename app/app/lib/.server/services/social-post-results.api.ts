import type { ApiClient } from "~/lib/.server/api/client";
import type { SocialProvider } from "~/lib/onboarding";
import type { SocialPostStatus } from "~/lib/types/social-account";
import type { PostAccountIdentity } from "~/lib/types/social-post";
import type {
  ConfigSource,
  ResolvedConfigField,
  SocialPostResultDetail,
} from "~/lib/types/social-post-result";

import { isSocialProvider } from "~/lib/onboarding";

import type { SocialPostResultsService } from "./social-post-results.service";

/** A media attachment as the API returns it (`social-posts` / config `media`). */
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

/** `GET /v1/social-post-results/:id` — the publish outcome for one account. Note
 * it carries NO timestamp and `error`/`details` are untyped provider payloads. */
interface ApiSocialPostResult {
  details: unknown;
  error: unknown;
  id: string;
  platform_data: { id?: null | string; url?: null | string } | null;
  post_id: string;
  social_account_id: string;
  success: boolean;
}

/** The account identity slice of `GET /v1/social-posts/:id` → `social_accounts`. */
interface ApiPostAccount {
  external_id: null | string;
  id: string;
  platform: string;
  profile_photo_url: null | string;
  username: null | string;
}

/** `GET /v1/social-posts/:id` — the owning post, for the cascade + account
 * identity + status. `platform_configurations` is keyed by platform;
 * `account_configurations` is a list scoped by `social_account_id`. */
interface ApiSocialPost {
  account_configurations:
    | { configuration: ApiConfiguration; social_account_id: string }[]
    | null;
  caption: string;
  created_at: string;
  media: ApiPostMedia[] | null;
  platform_configurations: Record<string, ApiConfiguration> | null;
  social_accounts: ApiPostAccount[];
  status: string;
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

/** Coerce the untyped `error` payload to a display string (null = no error). */
function toErrorMessage(error: unknown): null | string {
  if (error == null) return null;
  if (typeof error === "string") return error.trim() === "" ? null : error;
  return JSON.stringify(error);
}

/** Render a config value as a display string (null = nothing to show). Mirrors
 * the Supabase adapter so the resolved config is byte-identical across backends. */
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
 * account into its **fully resolved** configuration: every field that has a
 * value, tagged with the layer it resolved from. Ported 1:1 from the Supabase
 * adapter — same fields, same `source` tags, same display formatting (media is a
 * newline-joined URL list). The only shape difference: the platform layer is the
 * `platform_configurations[platform]` object and the account layer is this
 * account's `configuration` object (both flat: `caption`/`media` + platform keys).
 */
function resolveConfig(
  baseCaption: string,
  baseMedia: ApiPostMedia[],
  platformCfg: ApiConfiguration | undefined,
  accountCfg: ApiConfiguration | undefined,
): ResolvedConfigField[] {
  const resolved: ResolvedConfigField[] = [];

  // Caption — always present (the base caption is non-null).
  const captionSource: ConfigSource =
    accountCfg?.caption != null
      ? "account"
      : platformCfg?.caption != null
        ? "platform"
        : "global";
  resolved.push({
    field: "caption",
    source: captionSource,
    value: accountCfg?.caption ?? platformCfg?.caption ?? baseCaption,
  });

  // Media — account-scoped wins platform wins global (base) rows.
  const accountMedia = accountCfg?.media ?? [];
  const platformMedia = platformCfg?.media ?? [];
  const mediaSource: ConfigSource = accountMedia.length
    ? "account"
    : platformMedia.length
      ? "platform"
      : "global";
  const scopedMedia = accountMedia.length
    ? accountMedia
    : platformMedia.length
      ? platformMedia
      : baseMedia;
  if (scopedMedia.length) {
    resolved.push({
      field: "media",
      source: mediaSource,
      value: scopedMedia.map((m) => m.url).join("\n"),
    });
  }

  // Remaining platform-config fields — account-over-platform. `caption`/`media`
  // are handled above, so they're excluded here.
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
      resolved.push({
        field: key,
        source: fromAccount ? "account" : "platform",
        value,
      });
    }
  }

  return resolved;
}

/**
 * API-backed {@link SocialPostResultsService}, bound to a single project (the temp
 * key scopes every call, so the DTO's `projectId` is stamped from here).
 *
 * There is deliberately NO `expand` on results, so `get` makes TWO calls: the
 * result itself, then its owning post (for the cascade + account identity + post
 * status). The post is where the config layers live, so it's required to resolve
 * the account's fully-collapsed configuration.
 */
export function createApiSocialPostResultsService(
  client: ApiClient,
  projectId: string,
): SocialPostResultsService {
  return {
    async get(id): Promise<SocialPostResultDetail> {
      const result = await client.get<ApiSocialPostResult>(
        `/v1/social-post-results/${id}`,
      );
      const post = await client.get<ApiSocialPost>(
        `/v1/social-posts/${result.post_id}`,
      );

      const account = post.social_accounts.find(
        (a) => a.id === result.social_account_id,
      );
      if (!account) {
        // The result references an account that isn't on the post — treat the
        // record as unresolvable (matches the Supabase adapter's null-embed guard).
        throw new Error(`Result ${result.id} is missing its account`);
      }

      const platformCfg = post.platform_configurations?.[account.platform];
      const accountCfg = post.account_configurations?.find(
        (c) => c.social_account_id === account.id,
      )?.configuration;

      return {
        id: result.id,
        postId: result.post_id,
        projectId,
        // The API status is already the current vocabulary (no legacy `posted`).
        postStatus: post.status as SocialPostStatus,
        account: toIdentity(account),
        status: result.success ? "success" : "error",
        success: result.success,
        errorMessage: toErrorMessage(result.error),
        providerPostId: result.platform_data?.id ?? null,
        providerPostUrl: result.platform_data?.url ?? null,
        // The result carries no timestamp; the post's creation is the closest
        // available instant for the "Created" reference.
        createdAt: post.created_at,
        details: result.details,
        resolved: resolveConfig(
          post.caption,
          post.media ?? [],
          platformCfg,
          accountCfg,
        ),
      };
    },
  };
}

import type { ApiClient } from "~/lib/.server/api/client";
import type { SocialProvider } from "~/lib/onboarding";
import type {
  AccountPost,
  SocialAccount,
  SocialAccountListParams,
  SocialAccountListResult,
  SocialAccountTokenMeta,
  SocialAccountTokens,
} from "~/lib/types/social-account";

import { isSocialProvider } from "~/lib/onboarding";
import { DEFAULT_PAGE_SIZE, deriveStatus } from "~/lib/types/social-account";

import type {
  CreateAuthURLInput,
  SocialAccountsService,
} from "./social-accounts.service";

/** The API's social-account shape (`GET /v1/social-accounts`). Carries tokens +
 * expiries; note it has NO `created_at`, so `connectedAt` is null for API rows. */
interface ApiSocialAccount {
  access_token: null | string;
  access_token_expires_at: null | string;
  external_id: null | string;
  id: string;
  platform: string;
  profile_photo_url: null | string;
  refresh_token?: null | string;
  refresh_token_expires_at?: null | string;
  status: "connected" | "disconnected";
  user_id: string;
  username: null | string;
}

interface ApiListResponse<T> {
  data: T[];
  meta: { limit: number; next: null | string; offset: number; total: number };
}

/** The minimal post shape from `GET /v1/social-posts` used for the account's
 * "recent posts" table. */
interface ApiPostSummary {
  caption: null | string;
  external_id?: null | string;
  id: string;
  scheduled_at: null | string;
  status: string;
}

function appendAll(query: URLSearchParams, key: string, values: string[]): void {
  for (const value of values) query.append(key, value);
}

/**
 * API-backed {@link SocialAccountsService}, bound to a single project (the temp
 * key scopes every call to it, so the DTO's `projectId` is stamped from here).
 * The only code that knows the `/v1/social-accounts` wire shape.
 *
 * `status` health is re-derived from the token + expiry (the API only reports
 * `connected|disconnected`, but we surface `expired` too). `connectedAt` is null
 * — the API returns no timestamp. There is deliberately NO `delete`: the API only
 * disconnects (matching both legacy dashboards), so the port drops it.
 */
export function createApiSocialAccountsService(
  client: ApiClient,
  projectId: string,
): SocialAccountsService {
  function toAccount(row: ApiSocialAccount): SocialAccount {
    return {
      id: row.id,
      projectId,
      platform: (isSocialProvider(row.platform)
        ? row.platform
        : row.platform) as SocialProvider,
      username: row.username,
      avatarUrl: row.profile_photo_url,
      platformId: row.user_id,
      externalId: row.external_id,
      // The API says connected/disconnected; fold in `expired` from the expiry.
      status:
        row.status === "disconnected"
          ? "disconnected"
          : deriveStatus(row.access_token, row.access_token_expires_at),
      connectedAt: null,
    };
  }

  return {
    async list(
      _projectId,
      params: SocialAccountListParams = {},
    ): Promise<SocialAccountListResult> {
      const page = Math.max(1, params.page ?? 1);
      const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
      const query = new URLSearchParams();
      query.set("limit", String(pageSize));
      query.set("offset", String((page - 1) * pageSize));
      if (params.platform?.length) appendAll(query, "platform", params.platform);
      // The API only filters connected|disconnected; drop `expired` (a derived
      // sub-state) from the server filter.
      const apiStatus = (params.status ?? []).filter((s) => s !== "expired");
      if (apiStatus.length) appendAll(query, "status", apiStatus);
      if (params.username) query.append("username", params.username);
      if (params.externalId) query.append("external_id", params.externalId);

      const response = await client.get<ApiListResponse<ApiSocialAccount>>(
        `/v1/social-accounts?${query.toString()}`,
      );
      return {
        accounts: response.data.map(toAccount),
        total: response.meta.total,
        page,
        pageSize,
      };
    },

    async get(id): Promise<SocialAccount> {
      return toAccount(
        await client.get<ApiSocialAccount>(`/v1/social-accounts/${id}`),
      );
    },

    async getTokens(id): Promise<SocialAccountTokens> {
      const row = await client.get<ApiSocialAccount>(
        `/v1/social-accounts/${id}`,
      );
      return {
        accessToken: row.access_token,
        accessTokenExpiresAt: row.access_token_expires_at,
        refreshToken: row.refresh_token ?? null,
        refreshTokenExpiresAt: row.refresh_token_expires_at ?? null,
      };
    },

    async getTokenMeta(id): Promise<SocialAccountTokenMeta> {
      const row = await client.get<ApiSocialAccount>(
        `/v1/social-accounts/${id}`,
      );
      return {
        accessTokenExpiresAt: row.access_token_expires_at,
        refreshTokenExpiresAt: row.refresh_token_expires_at ?? null,
        hasAccessToken: row.access_token != null,
        hasRefreshToken: row.refresh_token != null,
      };
    },

    async listPostsForAccount(id): Promise<AccountPost[]> {
      const query = new URLSearchParams({ limit: "25" });
      query.append("social_account_id", id);
      const response = await client.get<ApiListResponse<ApiPostSummary>>(
        `/v1/social-posts?${query.toString()}`,
      );
      return response.data.map((row) => ({
        id: row.id,
        caption: row.caption ?? "",
        postAt: row.scheduled_at ?? "",
        // The API status is already the current vocabulary (no legacy `posted`).
        status: row.status as AccountPost["status"],
      }));
    },

    async createAuthURL(input: CreateAuthURLInput): Promise<{ url: string }> {
      return client.post<{ platform: string; url: string }>(
        "/v1/social-accounts/auth-url",
        {
          platform: input.platform,
          external_id: input.externalId,
          ...(input.config ?? {}),
        },
      );
    },

    async disconnect(id): Promise<void> {
      await client.post(`/v1/social-accounts/${id}/disconnect`, {});
    },
  };
}

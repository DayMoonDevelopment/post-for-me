import { isSocialProvider } from "~/lib/onboarding";
import {
  DEFAULT_PAGE_SIZE,
  isSocialPostStatus,
  type SocialPostListParams,
} from "~/lib/types/social-post";

/**
 * The posts list page is fully server-driven: every filter and the page live in
 * the URL search params, and the loader parses them into a
 * {@link SocialPostListParams}. The grid + filter bar write changes back via
 * {@link serializeListParams}, which re-runs the loader. Keeping parse + serialize
 * together here means the two directions can't drift.
 *
 * The API list has no fuzzy search or sort — the filters are the platform/status
 * chips plus two exact-match text fields (external id, social account id).
 *
 * URL keys: `platform` / `status` (comma-joined enums), `external_id`,
 * `social_account_id` (exact-match), `page` (1-based), `size`.
 */

function splitCsv(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function parseListParams(
  searchParams: URLSearchParams,
): SocialPostListParams {
  const params: SocialPostListParams = {};

  const platform = splitCsv(searchParams.get("platform")).filter(
    isSocialProvider,
  );
  if (platform.length > 0) params.platform = platform;

  const status = splitCsv(searchParams.get("status")).filter(isSocialPostStatus);
  if (status.length > 0) params.status = status;

  const externalId = searchParams.get("external_id")?.trim();
  if (externalId) params.externalId = externalId;

  const socialAccountId = searchParams.get("social_account_id")?.trim();
  if (socialAccountId) params.socialAccountId = socialAccountId;

  const page = Number.parseInt(searchParams.get("page") ?? "", 10);
  params.page = Number.isFinite(page) && page >= 1 ? page : 1;

  const size = Number.parseInt(searchParams.get("size") ?? "", 10);
  params.pageSize =
    Number.isFinite(size) && size >= 1 ? size : DEFAULT_PAGE_SIZE;

  return params;
}

export function serializeListParams(
  params: SocialPostListParams,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (params.platform?.length) {
    searchParams.set("platform", params.platform.join(","));
  }
  if (params.status?.length) {
    searchParams.set("status", params.status.join(","));
  }
  if (params.externalId) searchParams.set("external_id", params.externalId);
  if (params.socialAccountId) {
    searchParams.set("social_account_id", params.socialAccountId);
  }

  if (params.page && params.page > 1) {
    searchParams.set("page", String(params.page));
  }
  if (params.pageSize && params.pageSize !== DEFAULT_PAGE_SIZE) {
    searchParams.set("size", String(params.pageSize));
  }

  return searchParams;
}

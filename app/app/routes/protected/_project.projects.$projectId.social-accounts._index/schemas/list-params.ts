import { isSocialProvider } from "~/lib/onboarding";
import {
  DEFAULT_PAGE_SIZE,
  isSocialAccountStatus,
  type SocialAccountListParams,
  type SocialAccountStatus,
} from "~/lib/types/social-account";

/**
 * The list page is fully server-driven: every filter and the page live in the
 * URL search params, and the loader parses them into a
 * {@link SocialAccountListParams}. The grid + filter bar write changes back by
 * {@link serializeListParams}, which re-runs the loader. Keeping parse +
 * serialize together here means the two directions can't drift.
 *
 * The API list has no fuzzy search or sort — the filters are the platform/status
 * chips plus two exact-match text fields (username, external id).
 *
 * URL keys: `platform` / `status` (comma-joined enums), `username`,
 * `external_id` (exact-match), `page` (1-based), `size`.
 */

/** The API only filters on `connected`/`disconnected`; `expired` is a display-
 * only sub-state derived from the token expiry, so it isn't a filterable value. */
const FILTERABLE_STATUSES: readonly SocialAccountStatus[] = [
  "connected",
  "disconnected",
];

function isFilterableStatus(value: unknown): value is SocialAccountStatus {
  return (
    isSocialAccountStatus(value) &&
    (FILTERABLE_STATUSES as readonly string[]).includes(value)
  );
}

function splitCsv(raw: null | string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function parseListParams(
  searchParams: URLSearchParams,
): SocialAccountListParams {
  const params: SocialAccountListParams = {};

  const platform = splitCsv(searchParams.get("platform")).filter(
    isSocialProvider,
  );
  if (platform.length > 0) params.platform = platform;

  const status = splitCsv(searchParams.get("status")).filter(
    isFilterableStatus,
  );
  if (status.length > 0) params.status = status;

  const username = searchParams.get("username")?.trim();
  if (username) params.username = username;

  const externalId = searchParams.get("external_id")?.trim();
  if (externalId) params.externalId = externalId;

  const page = Number.parseInt(searchParams.get("page") ?? "", 10);
  params.page = Number.isFinite(page) && page >= 1 ? page : 1;

  const size = Number.parseInt(searchParams.get("size") ?? "", 10);
  params.pageSize = Number.isFinite(size) && size >= 1 ? size : DEFAULT_PAGE_SIZE;

  return params;
}

export function serializeListParams(
  params: SocialAccountListParams,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (params.platform?.length) {
    searchParams.set("platform", params.platform.join(","));
  }
  if (params.status?.length) {
    searchParams.set("status", params.status.join(","));
  }
  if (params.username) searchParams.set("username", params.username);
  if (params.externalId) searchParams.set("external_id", params.externalId);

  if (params.page && params.page > 1) {
    searchParams.set("page", String(params.page));
  }
  if (params.pageSize && params.pageSize !== DEFAULT_PAGE_SIZE) {
    searchParams.set("size", String(params.pageSize));
  }

  return searchParams;
}

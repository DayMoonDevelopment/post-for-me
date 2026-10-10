import type {
  WebhookEventListParams,
  WebhookEventSort,
  WebhookEventStatus,
  WebhookEventType,
} from "~/lib/types/webhook";

import {
  isWebhookEventStatus,
  isWebhookEventType,
  WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE,
} from "~/lib/types/webhook";

const SORT_FIELDS = ["createdAt", "status", "type"] as const;
const DEFAULT_SORT: WebhookEventSort = { field: "createdAt", direction: "desc" };

function splitCsv(raw: null | string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function isSortField(value: string): value is WebhookEventSort["field"] {
  return (SORT_FIELDS as readonly string[]).includes(value);
}

/**
 * Parse `URLSearchParams` → {@link WebhookEventListParams}. The detail loader
 * calls this so the events grid's page/sort/filters live entirely in the URL;
 * the component parses the same way from the pending navigation URL for
 * optimistic UI.
 */
export function parseEventListParams(
  searchParams: URLSearchParams,
): WebhookEventListParams {
  const params: WebhookEventListParams = {};

  const type = splitCsv(searchParams.get("type")).filter(
    isWebhookEventType,
  ) as WebhookEventType[];
  if (type.length > 0) params.type = type;

  const status = splitCsv(searchParams.get("status")).filter(
    isWebhookEventStatus,
  ) as WebhookEventStatus[];
  if (status.length > 0) params.status = status;

  const [field, direction] = (searchParams.get("sort") ?? "").split(".");
  if (field && isSortField(field) && (direction === "asc" || direction === "desc")) {
    params.sort = { field, direction };
  } else {
    params.sort = DEFAULT_SORT;
  }

  const page = Number.parseInt(searchParams.get("page") ?? "", 10);
  params.page = Number.isFinite(page) && page >= 1 ? page : 1;

  const size = Number.parseInt(searchParams.get("size") ?? "", 10);
  params.pageSize =
    Number.isFinite(size) && size >= 1 ? size : WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE;

  return params;
}

/** Serialize {@link WebhookEventListParams} → `URLSearchParams`, omitting
 * defaults to keep the URL clean. */
export function serializeEventListParams(
  params: WebhookEventListParams,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (params.type?.length) searchParams.set("type", params.type.join(","));
  if (params.status?.length) searchParams.set("status", params.status.join(","));

  const sort = params.sort ?? DEFAULT_SORT;
  const isDefaultSort =
    sort.field === DEFAULT_SORT.field && sort.direction === DEFAULT_SORT.direction;
  if (!isDefaultSort) searchParams.set("sort", `${sort.field}.${sort.direction}`);

  if (params.page && params.page > 1) searchParams.set("page", String(params.page));
  if (params.pageSize && params.pageSize !== WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE) {
    searchParams.set("size", String(params.pageSize));
  }

  return searchParams;
}

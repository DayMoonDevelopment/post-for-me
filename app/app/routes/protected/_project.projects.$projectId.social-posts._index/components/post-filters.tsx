import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigation } from "react-router";

import {
  type Filter,
  type FilterFieldConfig,
  Filters,
} from "~/components/filters";
import { FilterIcon } from "~/icons";
import { isSocialProvider } from "~/lib/onboarding";
import { ALL_PLATFORMS } from "~/lib/platform-meta";
import {
  isSocialPostStatus,
  SOCIAL_POST_STATUSES,
  type SocialPostListParams,
  type SocialPostStatus,
} from "~/lib/types/social-post";
import { cn } from "~/lib/utils";
import { Button } from "~/ui/button";
import { Input } from "~/ui/input";
import { Spinner } from "~/ui/spinner";

/** Status → dot color for the filter chip/option (the post lifecycle, distinct
 * from the per-account success dots). */
const STATUS_DOT_CLASS: Record<SocialPostStatus, string> = {
  draft: "bg-muted-foreground",
  scheduled: "bg-info",
  processing: "bg-warning",
  processed: "bg-success",
};

/**
 * A single exact-match text filter (external id / social account id). Local state
 * so the user can type freely; it commits to the URL params (resetting to page 1)
 * on blur or Enter, and re-seeds from the params whenever they change externally.
 */
function ExactMatchInput({
  value,
  onCommit,
  label,
  placeholder,
}: {
  label: string;
  onCommit: (next: string | undefined) => void;
  placeholder: string;
  value: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed !== value) onCommit(trimmed || undefined);
  }

  return (
    <Input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }
      }}
      placeholder={placeholder}
      aria-label={label}
      className="w-full sm:w-56"
    />
  );
}

/**
 * The posts filter bar (PFM-702). A row of exact-match inputs (external id ·
 * social account id) + the action slot (Create a post), then the `Filters`
 * add-trigger and the active platform/status chips. All state lives in the URL
 * params — this derives the `Filters` model from them and translates its
 * `onChange` back, so the server stays the source of truth. The operator is
 * locked to "is any of" since the service filters by membership only. The API has
 * no fuzzy search or sort — hence the exact-match inputs rather than a search box.
 */
export function PostFilters({
  params,
  onParamsChange,
  actionSlot,
}: {
  actionSlot?: ReactNode;
  onParamsChange: (next: SocialPostListParams) => void;
  params: SocialPostListParams;
}) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const isUpdating = navigation.state === "loading";

  const operators = useMemo(
    () => [{ value: "is_any_of", label: t("socialPosts.filters.isAnyOf") }],
    [t],
  );

  const fields = useMemo<FilterFieldConfig[]>(
    () => [
      {
        key: "platform",
        label: t("socialPosts.filters.platform"),
        type: "multiselect",
        operators,
        // Full brand color, no container — the marks read on their own.
        options: ALL_PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          return {
            value: platform.id,
            label: platform.label,
            icon: <Icon className="size-4" />,
          };
        }),
      },
      {
        key: "status",
        label: t("socialPosts.filters.status"),
        type: "multiselect",
        operators,
        options: SOCIAL_POST_STATUSES.map((status) => ({
          value: status,
          label: t(`socialPosts.status.${status}`),
          icon: (
            <span
              className={cn(
                "inline-block size-2.5 rounded-full",
                STATUS_DOT_CLASS[status],
              )}
            />
          ),
        })),
        // The chip shows the selected statuses as slightly-overlapping colored
        // dots (each ringed in the surface color) + a count — a bare `<span>`
        // icon collapses inline in the default trigger, so render them here in a
        // flex row where the sizes apply.
        customValueRenderer: (values) => {
          const statuses = values.map(String).filter(isSocialPostStatus);
          if (statuses.length === 0) return null;
          return (
            <span className="flex items-center gap-1.5">
              <span className="flex items-center -space-x-0.5">
                {statuses.slice(0, 4).map((status) => (
                  <span
                    key={status}
                    className={cn(
                      "size-2.5 rounded-full ring-2 ring-background",
                      STATUS_DOT_CLASS[status],
                    )}
                  />
                ))}
              </span>
              <span>
                {statuses.length === 1
                  ? t(`socialPosts.status.${statuses[0]}`)
                  : t("socialPosts.filters.selectedCount", {
                      count: statuses.length,
                    })}
              </span>
            </span>
          );
        },
      },
    ],
    [t, operators],
  );

  const filters = useMemo<Filter[]>(() => {
    const result: Filter[] = [];
    if (params.platform?.length) {
      result.push({
        id: "platform",
        field: "platform",
        operator: "is_any_of",
        values: params.platform,
      });
    }
    if (params.status?.length) {
      result.push({
        id: "status",
        field: "status",
        operator: "is_any_of",
        values: params.status,
      });
    }
    return result;
  }, [params.platform, params.status]);

  function handleFiltersChange(next: Filter[]) {
    const platform = (next.find((f) => f.field === "platform")?.values ?? [])
      .map(String)
      .filter(isSocialProvider);
    const status = (next.find((f) => f.field === "status")?.values ?? [])
      .map(String)
      .filter(isSocialPostStatus);
    onParamsChange({
      ...params,
      platform: platform.length ? platform : undefined,
      status: status.length ? status : undefined,
      page: 1,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: exact-match inputs · add-filter trigger · busy — (spacer) — Create. */}
      <div className="flex flex-wrap items-center gap-2">
        <ExactMatchInput
          value={params.externalId ?? ""}
          onCommit={(externalId) =>
            onParamsChange({ ...params, externalId, page: 1 })
          }
          label={t("socialPosts.filters.externalId")}
          placeholder={t("socialPosts.filters.externalId")}
        />
        <ExactMatchInput
          value={params.socialAccountId ?? ""}
          onCommit={(socialAccountId) =>
            onParamsChange({ ...params, socialAccountId, page: 1 })
          }
          label={t("socialPosts.filters.socialAccountId")}
          placeholder={t("socialPosts.filters.socialAccountId")}
        />
        <Filters
          parts="trigger"
          filters={filters}
          fields={fields}
          onChange={handleFiltersChange}
          size="sm"
          trigger={
            <Button variant="outline">
              <FilterIcon />
              {t("socialPosts.filters.add")}
            </Button>
          }
        />
        {isUpdating ? (
          <Spinner
            className="size-4 text-muted-foreground"
            aria-label={t("socialPosts.filters.updating")}
          />
        ) : null}
        {actionSlot ? <div className="ms-auto">{actionSlot}</div> : null}
      </div>

      {/* Row 2: the active filter chips */}
      {filters.length > 0 ? (
        <Filters
          parts="chips"
          filters={filters}
          fields={fields}
          onChange={handleFiltersChange}
          size="sm"
        />
      ) : null}
    </div>
  );
}

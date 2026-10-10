import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigation } from "react-router";

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
import {
  createFilterQuery,
  createFilterRule,
  FilterChip,
  type FilterField,
  type FilterQuery,
  type FilterRule,
  Filters,
  FiltersBuilder,
  type FilterValueDisplayContext,
  flattenFilterConditions,
  flattenFilterRules,
  useFilterState,
} from "~/ui/filters";
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

/** The multiselect "is any of" operator, locked (see the component doc). Its
 * `has_any_of` value is the Cascader Filters equivalent of the old `is_any_of`;
 * `arity: "many"` keeps the value stored as an array. */
const IS_ANY_OF = "has_any_of";

/** Order-independent equality for two optional string lists, so a re-selection
 * in a different order does not read as a change and re-navigate. */
function sameStringSet(a: string[] | undefined, b: string[] | undefined) {
  const x = a ?? [];
  const y = b ?? [];
  if (x.length !== y.length) return false;
  const set = new Set(x);
  return y.every((value) => set.has(value));
}

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
 * The active-filter chip row (Cascader Filters `variant="basic"`), on its own
 * line below the toolbar. Composed rather than using the shipped `FiltersRow`,
 * which bundles its own Add-filter trigger — ours lives in the toolbar above.
 * Renders nothing until there is at least one rule, mirroring the old two-row
 * layout where the chip row only appeared once a filter existed.
 */
function FilterChipsRow() {
  const { query } = useFilterState();
  const rules = flattenFilterRules(query);
  if (rules.length === 0) return null;
  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className="flex flex-wrap items-center gap-2"
    >
      {rules.map((rule, index) => (
        <FilterChip key={rule.id} rule={rule} index={index} />
      ))}
    </div>
  );
}

/**
 * The posts filter bar (PFM-702). A row of exact-match inputs (external id ·
 * social account id) + the action slot (Create a post), then the Cascader
 * Filters add-trigger and the active platform/status chips. All state lives in
 * the URL params — this derives the `FilterQuery` from them and flattens its
 * `onQueryChange` back, so the server stays the source of truth. The operator is
 * locked to "is any of" since the service filters by membership only. The API
 * has no fuzzy search or sort — hence the exact-match inputs rather than a search
 * box.
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

  const fields = useMemo<FilterField[]>(
    () => [
      {
        id: "platform",
        label: t("socialPosts.filters.platform"),
        type: "multiselect",
        // A single, locked operator — the service filters by membership only.
        operators: [
          {
            value: IS_ANY_OF,
            label: t("socialPosts.filters.isAnyOf"),
            arity: "many",
          },
        ],
        defaultOperator: IS_ANY_OF,
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
        id: "status",
        label: t("socialPosts.filters.status"),
        type: "multiselect",
        operators: [
          {
            value: IS_ANY_OF,
            label: t("socialPosts.filters.isAnyOf"),
            arity: "many",
          },
        ],
        defaultOperator: IS_ANY_OF,
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
        // icon collapses inline in the default value display, so render them
        // here in a flex row where the sizes apply.
        renderValue: (context: FilterValueDisplayContext) => {
          const statuses = context.values.map(String).filter(isSocialPostStatus);
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
    [t],
  );

  // The persisted projection: a `FilterQuery` rebuilt from the URL params. Rule
  // ids are the field paths so they stay stable across renders (which keeps an
  // open value editor attached to its chip while it is being edited).
  const paramsQuery = useMemo<FilterQuery>(() => {
    const rules: FilterRule<string[]>[] = [];
    if (params.platform?.length) {
      rules.push(
        createFilterRule({
          id: "platform",
          path: ["platform"],
          operator: IS_ANY_OF,
          value: params.platform,
        }),
      );
    }
    if (params.status?.length) {
      rules.push(
        createFilterRule({
          id: "status",
          path: ["status"],
          operator: IS_ANY_OF,
          value: params.status,
        }),
      );
    }
    return createFilterQuery(rules);
  }, [params.platform, params.status]);

  // The working tree the Filters component controls. Seeded from the params
  // projection, it also holds in-progress rules that project to no param yet (a
  // freshly-added filter with no value picked). Those must survive, so the tree
  // is only re-seeded from params on a *genuine* external change (back/forward,
  // a reset elsewhere) — detected below by comparing committed sets.
  const [query, setQuery] = useState<FilterQuery>(paramsQuery);
  useEffect(() => {
    setQuery((current) => {
      const committed = projectQuery(current);
      if (
        sameStringSet(committed.platform, params.platform) &&
        sameStringSet(committed.status, params.status)
      ) {
        return current;
      }
      return paramsQuery;
    });
  }, [paramsQuery, params.platform, params.status]);

  function projectQuery(next: FilterQuery) {
    const conditions = flattenFilterConditions(next);
    const platform = (
      conditions.find((condition) => condition.field === "platform")?.values ??
      []
    )
      .map(String)
      .filter(isSocialProvider);
    const status = (
      conditions.find((condition) => condition.field === "status")?.values ?? []
    )
      .map(String)
      .filter(isSocialPostStatus);
    return {
      platform: platform.length ? platform : undefined,
      status: status.length ? status : undefined,
    };
  }

  function handleQueryChange(next: FilterQuery) {
    setQuery(next);
    const committed = projectQuery(next);
    // Only navigate on a real change to the committed set; an in-progress edit
    // that projects to the same params must not reset the page or re-fetch.
    if (
      sameStringSet(committed.platform, params.platform) &&
      sameStringSet(committed.status, params.status)
    ) {
      return;
    }
    onParamsChange({
      ...params,
      platform: committed.platform,
      status: committed.status,
      page: 1,
    });
  }

  return (
    <Filters
      fields={fields}
      query={query}
      onQueryChange={handleQueryChange}
      variant="basic"
      size="sm"
    >
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
          <FiltersBuilder
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

        {/* Row 2: the active filter chips (their own line) */}
        <FilterChipsRow />
      </div>
    </Filters>
  );
}

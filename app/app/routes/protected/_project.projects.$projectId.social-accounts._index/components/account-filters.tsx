import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigation } from "react-router";

import { FilterIcon } from "~/icons";
import { isSocialProvider } from "~/lib/onboarding";
import { ALL_PLATFORMS } from "~/lib/platform-meta";
import {
  isSocialAccountStatus,
  type SocialAccountListParams,
  type SocialAccountStatus,
} from "~/lib/types/social-account";
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
  flattenFilterConditions,
  flattenFilterRules,
  useFilterState,
} from "~/ui/filters";
import { Input } from "~/ui/input";
import { Spinner } from "~/ui/spinner";

/** The API filters on `connected`/`disconnected` only; `expired` is a display-
 * only derived sub-state, so it isn't offered as a filter chip. */
const FILTERABLE_STATUSES: readonly SocialAccountStatus[] = [
  "connected",
  "disconnected",
];

/** Status → dot color, matching the avatar status dot so the filter chip reads
 * the same hue the grid does. */
const STATUS_DOT_CLASS: Record<SocialAccountStatus, string> = {
  connected: "bg-success",
  expired: "bg-warning",
  disconnected: "bg-muted-foreground",
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
 * A single exact-match text filter (username / external id). Local state so the
 * user can type freely; it commits to the URL params (resetting to page 1) on
 * blur or Enter, and re-seeds from the params whenever they change externally.
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
 * The filter bar (PFM-692). A row of exact-match inputs (username · external id)
 * + the action slot (Connect), then the Cascader Filters add-trigger and the
 * active platform/status chips. All state lives in the URL params — this derives
 * the `FilterQuery` from them and flattens its `onQueryChange` back, so the
 * server stays the source of truth.
 *
 * Platform option icons render in full brand color; status options use a colored
 * dot matching the grid. The operator is locked to "is any of" since the service
 * filters by membership only. The API has no fuzzy search or sort — hence the
 * exact-match inputs rather than a debounced search box.
 */
export function AccountFilters({
  params,
  onParamsChange,
  connectSlot,
}: {
  connectSlot?: ReactNode;
  onParamsChange: (next: SocialAccountListParams) => void;
  params: SocialAccountListParams;
}) {
  const { t } = useTranslation();
  // A filter change is a GET navigation; surface it as a busy spinner.
  const navigation = useNavigation();
  const isUpdating = navigation.state === "loading";

  const fields = useMemo<FilterField[]>(
    () => [
      {
        id: "platform",
        label: t("socialAccounts.filters.platform"),
        type: "multiselect",
        // A single, locked operator — the service filters by membership only
        // (`IN (...)` = "is any of"), so we lock the operator to that one rather
        // than offer operators the backend can't honor.
        operators: [
          {
            value: IS_ANY_OF,
            label: t("socialAccounts.filters.isAnyOf"),
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
        label: t("socialAccounts.filters.status"),
        type: "multiselect",
        operators: [
          {
            value: IS_ANY_OF,
            label: t("socialAccounts.filters.isAnyOf"),
            arity: "many",
          },
        ],
        defaultOperator: IS_ANY_OF,
        options: FILTERABLE_STATUSES.map((status) => ({
          value: status,
          label: t(`socialAccounts.status.${status}`),
          icon: (
            <span
              className={cn("size-2.5 rounded-full", STATUS_DOT_CLASS[status])}
            />
          ),
        })),
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
      .filter(isSocialAccountStatus);
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
        {/* Row 1: exact-match inputs · add-filter trigger · busy — (spacer) — Connect. */}
        <div className="flex flex-wrap items-center gap-2">
          <ExactMatchInput
            value={params.username ?? ""}
            onCommit={(username) =>
              onParamsChange({ ...params, username, page: 1 })
            }
            label={t("socialAccounts.filters.username")}
            placeholder={t("socialAccounts.filters.username")}
          />
          <ExactMatchInput
            value={params.externalId ?? ""}
            onCommit={(externalId) =>
              onParamsChange({ ...params, externalId, page: 1 })
            }
            label={t("socialAccounts.filters.externalId")}
            placeholder={t("socialAccounts.filters.externalId")}
          />
          <FiltersBuilder
            trigger={
              <Button variant="outline">
                <FilterIcon />
                {t("socialAccounts.filters.add")}
              </Button>
            }
          />
          {isUpdating ? (
            <Spinner
              className="size-4 text-muted-foreground"
              aria-label={t("socialAccounts.filters.updating")}
            />
          ) : null}
          {connectSlot ? <div className="ms-auto">{connectSlot}</div> : null}
        </div>

        {/* Row 2: the active filter chips (their own line) */}
        <FilterChipsRow />
      </div>
    </Filters>
  );
}

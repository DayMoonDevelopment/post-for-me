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
  isSocialAccountStatus,
  type SocialAccountListParams,
  type SocialAccountStatus,
} from "~/lib/types/social-account";
import { cn } from "~/lib/utils";
import { Button } from "~/ui/button";
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
 * The filter bar (PFM-692). A row of exact-match inputs (username · external id)
 * + the action slot (Connect), then the `Filters` add-trigger and the active
 * platform/status chips. All state lives in the URL params — this derives the
 * `Filters` model from them and translates its `onChange` back, so the server
 * stays the source of truth.
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

  // The service filters by membership only (`IN (...)` = "is any of"), so we lock
  // the operator to that one rather than offer operators the backend can't honor.
  const operators = useMemo(
    () => [{ value: "is_any_of", label: t("socialAccounts.filters.isAnyOf") }],
    [t],
  );

  const fields = useMemo<FilterFieldConfig[]>(
    () => [
      {
        key: "platform",
        label: t("socialAccounts.filters.platform"),
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
        label: t("socialAccounts.filters.status"),
        type: "multiselect",
        operators,
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
      .filter(isSocialAccountStatus);
    onParamsChange({
      ...params,
      platform: platform.length ? platform : undefined,
      status: status.length ? status : undefined,
      page: 1,
    });
  }

  return (
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
        <Filters
          parts="trigger"
          filters={filters}
          fields={fields}
          onChange={handleFiltersChange}
          size="sm"
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

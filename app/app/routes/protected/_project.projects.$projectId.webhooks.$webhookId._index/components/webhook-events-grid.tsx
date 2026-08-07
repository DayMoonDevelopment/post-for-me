import {
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { DataGridFeatures } from "~/components/data-grid/data-grid";
import type {
  WebhookEvent,
  WebhookEventListParams,
  WebhookEventSort,
  WebhookEventStatus,
} from "~/lib/types/webhook";

import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
} from "~/components/data-grid/data-grid";
import { DataGridColumnHeader } from "~/components/data-grid/data-grid-column-header";
import { DataGridPagination } from "~/components/data-grid/data-grid-pagination";
import { DataGridTable } from "~/components/data-grid/data-grid-table";
import { useGridPagination } from "~/hooks/use-grid-pagination";
import { WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE } from "~/lib/types/webhook";
import { Badge } from "~/ui/badge";
import { LocaleDateTime } from "~/ui/date-time";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/ui/tooltip";

const DEFAULT_SORT: WebhookEventSort = { field: "createdAt", direction: "desc" };

// Delivery status → badge variant. `completed` reads as success, `failed` as
// destructive, the in-flight states as neutral/informational.
const STATUS_VARIANT: Record<
  WebhookEventStatus,
  "destructive" | "info" | "secondary" | "success"
> = {
  completed: "success",
  failed: "destructive",
  pending: "secondary",
  processing: "info",
};

/**
 * Server-driven grid of a webhook's delivery events (PFM-709). Sort + pagination
 * are lifted into the URL via `onParamsChange` (the detail loader re-queries);
 * there's no row detail/replay for now. Status renders as a colored badge with a
 * tooltip naming the state.
 */
export function WebhookEventsGrid({
  events,
  total,
  params,
  onParamsChange,
}: {
  events: WebhookEvent[];
  onParamsChange: (next: WebhookEventListParams) => void;
  params: WebhookEventListParams;
  total: number;
}) {
  const { t } = useTranslation();
  const sort = params.sort ?? DEFAULT_SORT;

  const sorting: SortingState = [
    { id: sort.field, desc: sort.direction === "desc" },
  ];

  // Sorting stays local (only this grid sorts); pagination + the pending state
  // are the shared wiring.
  const { pagination, onPaginationChange, isLoading } = useGridPagination({
    params,
    onParamsChange,
    defaultPageSize: WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE,
  });

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    const first = next[0];
    const nextSort: WebhookEventSort = first
      ? {
          field: first.id as WebhookEventSort["field"],
          direction: first.desc ? "desc" : "asc",
        }
      : DEFAULT_SORT;
    onParamsChange({ ...params, sort: nextSort, page: 1 });
  };

  const columns = useMemo<ColumnDef<DataGridFeatures, WebhookEvent>[]>(
    () => [
      {
        accessorKey: "type",
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t("webhooks.events.columns.type")}
            column={column}
          />
        ),
        cell: ({ row }) => (
          <Badge variant="secondary" size="xs" className="font-mono">
            {row.original.type}
          </Badge>
        ),
        size: 260,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t("webhooks.events.columns.status")}
            column={column}
          />
        ),
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge variant={STATUS_VARIANT[status]} size="xs">
                    {t(`webhooks.events.status.${status}`)}
                  </Badge>
                }
              />
              <TooltipContent>
                {t(`webhooks.events.statusHint.${status}`)}
              </TooltipContent>
            </Tooltip>
          );
        },
        size: 140,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t("webhooks.events.columns.created")}
            column={column}
          />
        ),
        cell: ({ row }) =>
          row.original.createdAt ? (
            <LocaleDateTime
              value={row.original.createdAt}
              className="text-muted-foreground"
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        size: 220,
      },
    ],
    [t],
  );

  const table = useTable({
    features: dataGridFeatures,
    data: events,
    columns,
    pageCount: Math.max(1, Math.ceil(total / pagination.pageSize)),
    state: { sorting, pagination },
    onSortingChange: handleSortingChange,
    onPaginationChange,
    manualSorting: true,
    manualPagination: true,
    getRowId: (row) => row.id,
  });

  return (
    // Sorting and paging both round-trip to the loader, so the grid shows
    // skeleton rows rather than stale ones.
    <DataGrid table={table} recordCount={total} isLoading={isLoading}>
      <div className="space-y-2.5">
        <DataGridContainer>
          <div className="overflow-x-auto">
            <DataGridTable />
          </div>
        </DataGridContainer>
        <DataGridPagination />
      </div>
    </DataGrid>
  );
}

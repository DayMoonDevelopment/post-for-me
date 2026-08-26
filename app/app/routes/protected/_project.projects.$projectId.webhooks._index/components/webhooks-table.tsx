import { type ColumnDef, useTable } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import type { DataGridFeatures } from "~/components/data-grid/data-grid";
import type { WebhookSummary } from "~/lib/types/webhook";

import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
} from "~/components/data-grid/data-grid";
import { DataGridColumnHeader } from "~/components/data-grid/data-grid-column-header";
import { DataGridTable } from "~/components/data-grid/data-grid-table";
import { RowLink } from "~/components/grid-cells";
import { DeleteIcon, EditIcon, MoreIcon } from "~/icons";
import { Badge } from "~/ui/badge";
import { Button } from "~/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/ui/dropdown-menu";
import { Skeleton } from "~/ui/skeleton";

/** See the note in the API keys table — this list has no pagination either. */
const SKELETON_ROW_COUNT = 4;

function RowActions({
  webhook,
  onEdit,
  onDelete,
}: {
  onDelete: (webhook: WebhookSummary) => void;
  onEdit: (webhook: WebhookSummary) => void;
  webhook: WebhookSummary;
}) {
  const { t } = useTranslation();

  return (
    // Stop propagation so the menu doesn't trigger the row's
    // navigate-to-detail click.
    <div onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("webhooks.actions.menu")}
            >
              <MoreIcon />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(webhook)}>
            <EditIcon />
            {t("common.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(webhook)}
          >
            <DeleteIcon />
            {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * Dumb table of a project's webhooks — URL · subscribed event types, plus a
 * per-row actions menu (edit / delete) wired to the host's passthrough
 * handlers. A row click opens the webhook's detail page.
 *
 * Built on the shared DataGrid rather than hand-rolled `<table>` markup, so it
 * inherits the same shell, density, and skeleton treatment as every other table
 * in the app. Few webhooks per project, so there is no pagination and no
 * `DataGridPagination`; `pageSize` serves only to size the loading state.
 */
export function WebhooksTable({
  webhooks,
  projectId,
  onEdit,
  onDelete,
  isLoading = false,
}: {
  /** Renders the loading skeleton in place of rows — see the route's Suspense boundary. */
  isLoading?: boolean;
  onDelete: (webhook: WebhookSummary) => void;
  onEdit: (webhook: WebhookSummary) => void;
  projectId: string;
  webhooks: WebhookSummary[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const columns = useMemo<ColumnDef<DataGridFeatures, WebhookSummary>[]>(
    () => [
      {
        accessorKey: "url",
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t("webhooks.columns.url")}
            column={column}
          />
        ),
        cell: ({ row }) => (
          // The URL cell is this row's navigating link — a `<tr>` onClick alone
          // is mouse-only.
          <RowLink to={`/projects/${projectId}/webhooks/${row.original.id}`}>
            <span className="block truncate font-medium">
              {row.original.url}
            </span>
          </RowLink>
        ),
        enableSorting: false,
        size: 360,
        meta: { skeleton: <Skeleton className="h-3.5 w-56" /> },
      },
      {
        accessorKey: "eventTypes",
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t("webhooks.columns.eventTypes")}
            column={column}
          />
        ),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.eventTypes.map((type) => (
              <Badge
                key={type}
                variant="secondary"
                size="xs"
                className="font-mono"
              >
                {type}
              </Badge>
            ))}
          </div>
        ),
        enableSorting: false,
        size: 280,
        meta: {
          // Two `size="xs"` (h-4) badges — a subscription is rarely just one,
          // and the real count isn't knowable before the rows land.
          skeleton: (
            <div className="flex gap-1">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
          ),
        },
      },
      {
        id: "actions",
        // No visible label, but the header cell still needs an accessible name
        // — an empty `<th>` leaves screen-reader table navigation announcing an
        // unnamed column.
        header: () => <span className="sr-only">{t("common.actions")}</span>,
        cell: ({ row }) => (
          <RowActions
            webhook={row.original}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ),
        enableSorting: false,
        size: 56,
        meta: {
          cellClassName: "text-right",
          skeleton: <Skeleton className="ms-auto size-7 rounded-md" />,
        },
      },
    ],
    [t, projectId, onEdit, onDelete],
  );

  const table = useTable({
    features: dataGridFeatures,
    data: webhooks,
    columns,
    getRowId: (row) => row.id,
    initialState: {
      pagination: { pageIndex: 0, pageSize: SKELETON_ROW_COUNT },
    },
    manualPagination: true,
  });

  return (
    <DataGrid
      table={table}
      recordCount={webhooks.length}
      isLoading={isLoading}
      tableLayout={{ rowBorder: true, width: "fixed" }}
      tableClassNames={{ base: "min-w-[44rem]!" }}
      emptyMessage={t("webhooks.grid.empty")}
      onRowClick={(webhook) =>
        navigate(`/projects/${projectId}/webhooks/${webhook.id}`)
      }
    >
      <DataGridContainer>
        <div className="overflow-x-auto">
          <DataGridTable />
        </div>
      </DataGridContainer>
    </DataGrid>
  );
}

import { type ColumnDef, useTable } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { DataGridFeatures } from "~/components/data-grid/data-grid";
import type { ApiKey } from "~/lib/types/api-key";

import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
} from "~/components/data-grid/data-grid";
import { DataGridColumnHeader } from "~/components/data-grid/data-grid-column-header";
import { DataGridTable } from "~/components/data-grid/data-grid-table";
import { DeleteIcon, EditIcon, MoreIcon } from "~/icons";
import { Button } from "~/ui/button";
import { LocaleDateTime } from "~/ui/date-time";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/ui/dropdown-menu";
import { Skeleton } from "~/ui/skeleton";

/**
 * How many skeleton rows to show while the list is in flight. The paginated
 * grids take this from `pageSize`; this list has no pagination, so it names a
 * plausible number instead — enough to read as "a table is coming" without
 * implying a count.
 */
const SKELETON_ROW_COUNT = 5;

function RowActions({
  apiKey,
  onRename,
  onDelete,
}: {
  apiKey: ApiKey;
  onDelete: (apiKey: ApiKey) => void;
  onRename: (apiKey: ApiKey) => void;
}) {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("apiKeys.actions.menu")}
          >
            <MoreIcon />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onRename(apiKey)}>
          <EditIcon />
          {t("apiKeys.actions.rename")}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onDelete(apiKey)}
        >
          <DeleteIcon />
          {t("common.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Dumb, composable table of a project's API keys — Name · Key reference (masked
 * preview) · Created · Created by, plus a per-row actions menu (rename / delete)
 * wired to the host's passthrough handlers. Renders our domain {@link ApiKey}
 * (never the provider's shape) and does no fetching.
 *
 * Built on the shared DataGrid rather than hand-rolled `<table>` markup, so it
 * inherits the same shell, density, and skeleton treatment as every other table
 * in the app. There is no pagination — a project has few keys — so no
 * `DataGridPagination` is rendered and `pageSize` serves only to size the
 * loading state.
 */
export function ApiKeysTable({
  apiKeys,
  onRename,
  onDelete,
  isLoading = false,
}: {
  apiKeys: ApiKey[];
  /** Renders the loading skeleton in place of rows — see the route's Suspense boundary. */
  isLoading?: boolean;
  onDelete: (apiKey: ApiKey) => void;
  onRename: (apiKey: ApiKey) => void;
}) {
  const { t } = useTranslation();

  const columns = useMemo<ColumnDef<DataGridFeatures, ApiKey>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t("apiKeys.columns.name")}
            column={column}
          />
        ),
        cell: ({ row }) =>
          row.original.name ?? (
            <span className="text-muted-foreground">{t("apiKeys.unnamed")}</span>
          ),
        enableSorting: false,
        size: 220,
        meta: {
          cellClassName: "font-medium",
          skeleton: <Skeleton className="h-3.5 w-32" />,
        },
      },
      {
        accessorKey: "reference",
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t("apiKeys.columns.reference")}
            column={column}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.reference}…
          </span>
        ),
        enableSorting: false,
        size: 200,
        // The masked preview is `text-xs`, so its bar is shorter than the rest.
        meta: { skeleton: <Skeleton className="h-3 w-24" /> },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t("apiKeys.columns.created")}
            column={column}
          />
        ),
        cell: ({ row }) => (
          <LocaleDateTime
            value={row.original.createdAt}
            className="text-muted-foreground"
          />
        ),
        enableSorting: false,
        size: 180,
        meta: {
          cellClassName: "whitespace-nowrap",
          skeleton: <Skeleton className="h-3.5 w-28" />,
        },
      },
      {
        accessorKey: "createdBy",
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t("apiKeys.columns.createdBy")}
            column={column}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.createdBy?.label ?? "—"}
          </span>
        ),
        enableSorting: false,
        size: 180,
        meta: {
          cellClassName: "whitespace-nowrap",
          skeleton: <Skeleton className="h-3.5 w-20" />,
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
            apiKey={row.original}
            onRename={onRename}
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
    [t, onRename, onDelete],
  );

  const table = useTable({
    features: dataGridFeatures,
    data: apiKeys,
    columns,
    getRowId: (row) => row.id,
    // `initialState`, not `state`: nothing here drives pagination, and an
    // uncontrolled slice needs no change handler to avoid freezing.
    initialState: {
      pagination: { pageIndex: 0, pageSize: SKELETON_ROW_COUNT },
    },
    manualPagination: true,
  });

  return (
    <DataGrid
      table={table}
      recordCount={apiKeys.length}
      isLoading={isLoading}
      tableLayout={{ rowBorder: true, width: "fixed" }}
      // Force a min content width so narrow viewports scroll the table
      // horizontally instead of crushing the columns.
      tableClassNames={{ base: "min-w-[44rem]!" }}
      emptyMessage={t("apiKeys.grid.empty")}
    >
      <DataGridContainer>
        <div className="overflow-x-auto">
          <DataGridTable />
        </div>
      </DataGridContainer>
    </DataGrid>
  );
}

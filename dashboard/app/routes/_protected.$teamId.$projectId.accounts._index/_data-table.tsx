import * as React from "react";
import { useTable } from "@tanstack/react-table";

import {
  DataGridColumnVisibility,
  DataGridTable,
  dataGridFeatures,
} from "~/ui/data-grid";

import { columns } from "./_columns";
import { TableFilters } from "./_table-filters";
import { TablePagination } from "./_table-pagination";

import type { LoaderData } from "./_types";
import type { SortingState } from "@tanstack/react-table";

interface DataTableProps {
  data: LoaderData;
}

export function SocialConnectionsDataTable({ data }: DataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState({});

  const connections = React.useMemo(
    () => data.connections || [],
    [data.connections],
  );

  const table = useTable({
    features: dataGridFeatures,
    data: connections,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
  });

  if (!data.success) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">
          {"Failed to load social connections"}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <TableFilters />
        <DataGridColumnVisibility table={table} />
      </div>

      <DataGridTable
        table={table}
        columnCount={columns.length}
        emptyMessage="No social connections found."
      />

      <TablePagination data={data} />
    </div>
  );
}

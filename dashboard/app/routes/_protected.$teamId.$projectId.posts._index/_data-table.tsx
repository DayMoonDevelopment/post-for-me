import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
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

export function PostsDataTable({ data }: DataTableProps) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState({});

  const posts = useMemo(() => data.posts || [], [data.posts]);

  const table = useTable({
    features: dataGridFeatures,
    data: posts,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
  });

  if (!data.success) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">
          {data.error || "Failed to load posts"}
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
        onRowClick={(post) => navigate(`${post.id}`)}
        emptyMessage="No posts found."
      />

      <TablePagination data={data} />
    </div>
  );
}

import * as React from "react";
import { useTable } from "@tanstack/react-table";
import { useLoaderData } from "react-router";

import { Button } from "~/ui/button";
import {
  DataGridColumnVisibility,
  DataGridTable,
  dataGridFeatures,
} from "~/ui/data-grid";

import { columns } from "./_columns";

import type {
  ColumnVisibilityState,
  SortingState,
} from "@tanstack/react-table";

export function AccountFeedDataTable() {
  const data = useLoaderData();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({
      engagement: false,
      reach: false,
      watch_time: false,
    });

  const isYouTube = data.accountInfo?.provider === "youtube";

  const tableColumns = React.useMemo(() => {
    if (!isYouTube) return columns;

    return columns.filter((col) => {
      if (col.id === "engagement") return false;
      if (col.id === "reach") return false;
      return true;
    });
  }, [isYouTube]);

  const posts = React.useMemo(() => data.posts || [], [data.posts]);

  const table = useTable({
    features: dataGridFeatures,
    data: posts,
    columns: tableColumns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
  });

  if (!data.success) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">
          {data.error || "Failed to load social account feed"}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-end">
        <DataGridColumnVisibility table={table} />
      </div>

      <DataGridTable
        table={table}
        columnCount={tableColumns.length}
        emptyMessage="No posts found for this account."
      />

      {data.meta.has_more ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set("cursor", data.meta.cursor || "");
              window.location.href = url.toString();
            }}
          >
            Load More
          </Button>
        </div>
      ) : null}
    </div>
  );
}

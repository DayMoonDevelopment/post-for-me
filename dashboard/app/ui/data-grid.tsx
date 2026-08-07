/**
 * Trimmed, vendored ReUI Data Grid — rebuilt on TanStack Table v9.
 *
 * This is intentionally NOT a 1:1 copy of the upstream ReUI Data Grid
 * (https://reui.io/docs/components/base/data-grid). Our tables have diverged
 * from the vendored copy in both style and organization on purpose, so this
 * file ports only the pieces we actually use:
 *
 *   - the v9 `useTable` / `tableFeatures` architecture (replacing v8's
 *     `useReactTable` + `getXxxRowModel()` options),
 *   - a reusable sortable column header (`DataGridColumnHeader`),
 *   - a reusable column-visibility toggle (`DataGridColumnVisibility`),
 *   - a single table renderer (`DataGridTable`) that owns our shared markup
 *     (the `bg-card rounded-md border` shell, row-click navigation, empty and
 *     loading states) so the per-route data tables stop re-implementing it.
 *
 * Deliberately dropped from upstream: virtualization, drag-and-drop, row/column
 * pinning, tree rows, aggregate footers and client-side pagination — none of
 * which our server-driven tables need. Our styling is built on this app's own
 * `~/ui/table` primitives and Radix-based dropdown, not upstream's Base UI ones.
 */
import * as React from "react";
import {
  columnVisibilityFeature,
  createSortedRowModel,
  flexRender,
  metaHelper,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_alphanumericCaseSensitive,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  sortFn_textCaseSensitive,
  tableFeatures,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/table";
import { Skeleton } from "~/ui/skeleton";

import type {
  Column,
  ColumnDef,
  RowData,
  Table as TableInstance,
} from "@tanstack/react-table";
import type { ReactNode } from "react";

/**
 * Per-column extras the grid reads off `columnDef.meta`.
 *
 * v9 resolves this through the `columnMeta` slot on the feature bundle below
 * instead of a global `declare module` augmentation, so consuming the data grid
 * no longer widens `ColumnMeta` for every other table in the app.
 */
export interface DataGridColumnMeta {
  /** Label used by the column header and the visibility toggle. */
  headerTitle?: string;
  /** Extra classes applied to this column's `<th>`. */
  headerClassName?: string;
  /** Extra classes applied to this column's `<td>`. */
  cellClassName?: string;
}

/**
 * The trimmed feature bundle every data table in this app builds on. v9
 * requires each table to declare its features up front:
 *   - `columnVisibilityFeature` gates `row.getVisibleCells()` /
 *     `column.getIsVisible()` — needed even by tables that never hide a column.
 *   - `rowSortingFeature` + `sortedRowModel` power client-side sorting.
 *   - the `sortFns` map lets `sortFn: "auto"` resolve to a built-in.
 */
export const dataGridFeatures = tableFeatures({
  columnVisibilityFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    alphanumericCaseSensitive: sortFn_alphanumericCaseSensitive,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
    textCaseSensitive: sortFn_textCaseSensitive,
  },
  columnMeta: metaHelper<DataGridColumnMeta>(),
});

/** The feature set `dataGridFeatures` registers. */
export type DataGridFeatures = typeof dataGridFeatures;

/** A column definition bound to the app's feature bundle. */
export type DataGridColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<
  DataGridFeatures,
  TData,
  TValue
>;

/** A table instance bound to the app's feature bundle. */
export type DataGridTableInstance<TData extends RowData> = TableInstance<
  DataGridFeatures,
  TData
>;

/** Label for a column: `meta.headerTitle`, a string `columnDef.header`, or `column.id`. */
export function getColumnHeaderLabel<TData extends RowData, TValue>(
  column: Column<DataGridFeatures, TData, TValue>,
): string {
  const meta = column.columnDef.meta;
  if (typeof meta?.headerTitle === "string") return meta.headerTitle;
  const defHeader = column.columnDef.header;
  if (typeof defHeader === "string") return defHeader;
  return String(column.id);
}

// ---------------------------------------------------------------------------
// Sortable column header
// ---------------------------------------------------------------------------

interface DataGridColumnHeaderProps<TData extends RowData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<DataGridFeatures, TData, TValue>;
  /** Defaults to `meta.headerTitle`, then a string `columnDef.header`, then `column.id`. */
  title?: string;
  /** Horizontal alignment of the header label. */
  align?: "start" | "center" | "end";
}

/**
 * Replaces the ad-hoc `<Button onClick={() => column.toggleSorting(...)}>`
 * blocks the per-route column files used to repeat. Cycles asc → desc → none
 * on click, and falls back to a plain label for non-sortable columns.
 */
export function DataGridColumnHeader<TData extends RowData, TValue>({
  column,
  title,
  align = "start",
  className,
  ...props
}: DataGridColumnHeaderProps<TData, TValue>) {
  const label = title ?? getColumnHeaderLabel(column);
  const alignClass =
    align === "center"
      ? "justify-center"
      : align === "end"
        ? "justify-end"
        : "justify-start";

  if (!column.getCanSort()) {
    return (
      <div className={cn("flex items-center", alignClass, className)} {...props}>
        {label}
      </div>
    );
  }

  const sorted = column.getIsSorted();
  const SortIcon =
    sorted === "asc"
      ? ArrowUpIcon
      : sorted === "desc"
        ? ArrowDownIcon
        : ChevronsUpDownIcon;

  const handleSort = () => {
    if (sorted === "asc") {
      column.toggleSorting(true);
    } else if (sorted === "desc") {
      column.clearSorting();
    } else {
      column.toggleSorting(false);
    }
  };

  return (
    <div className={cn("flex items-center", alignClass, className)} {...props}>
      <button
        type="button"
        onClick={handleSort}
        className="text-muted-foreground hover:text-foreground data-[sorted=true]:text-foreground -mx-2 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors"
        data-sorted={sorted !== false}
      >
        {label}
        <SortIcon className="size-4 opacity-60" aria-hidden="true" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column-visibility toggle
// ---------------------------------------------------------------------------

/**
 * The "Columns" dropdown, shared by every data table. Reads each hideable
 * column's label from `meta.headerTitle` (falling back to a string header or
 * the column id), replacing the near-identical dropdown each route used to
 * inline. Uses this app's Radix-based dropdown, not upstream's Base UI one.
 */
export function DataGridColumnVisibility<TData extends RowData>({
  table,
  label = "Columns",
  align = "end",
}: {
  table: DataGridTableInstance<TData>;
  label?: ReactNode;
  align?: "start" | "center" | "end";
}) {
  const columns = table
    .getAllColumns()
    .filter((column) => column.getCanHide());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="ml-auto bg-card">
          {label} <ChevronDownIcon className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            className="capitalize"
            checked={column.getIsVisible()}
            onCheckedChange={(value) => column.toggleVisibility(!!value)}
          >
            {getColumnHeaderLabel(column)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// Table renderer
// ---------------------------------------------------------------------------

interface DataGridTableProps<TData extends RowData> {
  table: DataGridTableInstance<TData>;
  /** Number of leaf columns, used for the empty-state colSpan. */
  columnCount: number;
  /** Row click handler; when set, rows become keyboard-focusable and clickable. */
  onRowClick?: (row: TData) => void;
  /** Message shown when there are no rows. */
  emptyMessage?: ReactNode;
  /** Renders skeleton rows instead of data. */
  isLoading?: boolean;
  /** Skeleton row count while loading. */
  loadingRowCount?: number;
  /** Extra classes for the outer card shell. */
  className?: string;
}

// Interactive descendants that should swallow a row click instead of
// triggering row navigation.
const INTERACTIVE_SELECTOR =
  'a,button,input,textarea,select,[role="button"],[role="menuitem"],[data-row-click="ignore"]';

/**
 * The shared table body. Owns the `bg-card rounded-md border` shell, header and
 * cell rendering, the empty state, an optional loading skeleton and optional
 * row-click navigation (with a guard so clicks on inner controls don't
 * navigate) — all previously copy-pasted across the route data tables.
 */
export function DataGridTable<TData extends RowData>({
  table,
  columnCount,
  onRowClick,
  emptyMessage = "No results.",
  isLoading = false,
  loadingRowCount = 5,
  className,
}: DataGridTableProps<TData>) {
  const rows = table.getRowModel().rows;
  const clickable = Boolean(onRowClick);

  return (
    <div className={cn("bg-card rounded-md border", className)}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={header.column.columnDef.meta?.headerClassName}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: loadingRowCount }).map((_, rowIndex) => (
              <TableRow key={`skeleton-${rowIndex}`}>
                {Array.from({ length: columnCount }).map((__, cellIndex) => (
                  <TableCell key={`skeleton-${rowIndex}-${cellIndex}`}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length ? (
            rows.map((row) => (
              <TableRow
                key={row.id}
                tabIndex={clickable ? 0 : undefined}
                className={cn(clickable && "cursor-pointer")}
                onClick={
                  clickable
                    ? (event) => {
                        const target = event.target as HTMLElement | null;
                        if (!target) return;
                        if (event.defaultPrevented) return;
                        // Don't navigate when interacting with inner controls/links.
                        if (target.closest(INTERACTIVE_SELECTOR)) return;
                        onRowClick?.(row.original);
                      }
                    : undefined
                }
                onKeyDown={
                  clickable
                    ? (event) => {
                        // Only navigate when the row itself has focus.
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick?.(row.original);
                        }
                      }
                    : undefined
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cell.column.columnDef.meta?.cellClassName}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-24 text-center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

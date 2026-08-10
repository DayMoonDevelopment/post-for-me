import type {
  CellData,
  Column,
  ColumnFiltersState,
  ReactTable,
  RowData,
  SortingState,
  TableFeatures,
} from "@tanstack/react-table"
import type { ReactNode } from "react"

import {
  columnFacetingFeature,
  columnFilteringFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createFacetedRowModel,
  createFacetedUniqueValues,
  globalFilteringFeature,
  metaHelper,
  rowExpandingFeature,
  rowPaginationFeature,
  rowPinningFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table"
import { createContext, useContext, useEffect, useMemo, useRef } from "react"

import { cn } from "~/lib/utils"

/**
 * The one feature bundle every grid in this app is built with.
 *
 * v9 only exposes a feature's API when that feature is registered, and the
 * shared renderers below call pinning, sizing, resizing, expanding, and
 * selection APIs unconditionally — so a consumer with a narrower set would
 * break the shared components rather than merely shrink its own bundle. One
 * bundle keeps that invariant honest, and lets the components stay generic
 * over `TData` alone instead of threading a `TFeatures` parameter through
 * ~5k lines.
 *
 * Client-side row models (`filteredRowModel`, `sortedRowModel`,
 * `paginatedRowModel`) are deliberately absent: every grid here is
 * server-driven via `manualPagination`/`manualSorting`. A consumer that wants
 * client-side processing registers the model it needs on its own table.
 * Faceting is the exception — it is inherently client-side, so its slots ship
 * here to keep `column.getFacetedUniqueValues()` working.
 */
export const dataGridFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  columnFacetingFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnResizingFeature,
  columnVisibilityFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowPinningFeature,
  rowSelectionFeature,
  rowSortingFeature,
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  columnMeta: metaHelper<DataGridColumnMeta>(),
  // `'auto'` resolves only against registered names, so the built-ins a
  // client-sorting consumer would reach for are registered up front.
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
})

export type DataGridFeatures = typeof dataGridFeatures

/**
 * The table instance shape every shared grid component consumes.
 *
 * `ReactTable`, not core `Table`: the render-time state surface these
 * components read (`table.state`) is contributed by the React adapter, which
 * also deprecates the `table.store.state` snapshot for render reads.
 */
export type DataGridTableInstance<TData extends RowData> = ReactTable<
  DataGridFeatures,
  TData
>

/**
 * The type of `columnDef.meta` for every grid in this app.
 *
 * Registered as the features-level `columnMeta` slot rather than by
 * augmenting the global `ColumnMeta` interface, which is what v9 (and the
 * upstream ReUI grid) call for. The two are not additive: a features-level
 * slot *overrides* the global interface, so keeping a `declare module`
 * augmentation alongside one would silently drop these fields.
 *
 * `expandedContent` is row-untyped because a type-only slot is fixed for the
 * table and cannot be generic over `TData`; the renderer calls it with
 * `row.original`.
 */
export type DataGridColumnMeta = {
  autoSize?: boolean
  cellClassName?: string
  expandedContent?: (row: any) => ReactNode
  headerClassName?: string
  headerTitle?: string
  skeleton?: ReactNode
}

/** Label for headers / column visibility: `meta.headerTitle`, string `columnDef.header`, or `column.id`. */
export function getColumnHeaderLabel<
  TFeatures extends TableFeatures,
  TData extends RowData,
  TValue extends CellData,
>(column: Column<TFeatures, TData, TValue>): string {
  const meta = column.columnDef.meta as { headerTitle?: string } | undefined
  if (typeof meta?.headerTitle === "string") return meta.headerTitle
  const defHeader = column.columnDef.header
  if (typeof defHeader === "string") return defHeader
  return String(column.id)
}

export type DataGridApiFetchParams = {
  filters?: ColumnFiltersState
  pageIndex: number
  pageSize: number
  searchQuery?: string
  sorting?: SortingState
}

export type DataGridApiResponse<T> = {
  data: T[]
  empty: boolean
  pagination: {
    page: number
    total: number
  }
}

export interface DataGridContextProps<TData extends RowData> {
  /**
   * Internal coordinator for `meta.autoSize` columns. Lives at the core level
   * so every table variant and viewport instance shares one application state.
   */
  autoSize?: DataGridAutoSizeController
  isLoading: boolean
  props: DataGridProps<TData>
  recordCount: number
  table: DataGridTableInstance<TData>
}

export type DataGridAutoSizeController = {
  /**
   * Grows the first visible `meta.autoSize` column by the given free space.
   * Applies at most once per column id; safe to call from every viewport
   * measurement. Returns true when a sizing update was dispatched.
   */
  apply: (fillWidth: number) => boolean
}

function createDataGridAutoSizeController<TData extends RowData>(
  // Resolved per call rather than captured: v9's `useTable` returns a fresh
  // wrapper on nearly every render (see `DataGridProvider`), and this
  // controller must outlive that churn to keep its "grown at most once per
  // column" guard. The ref behind this getter always holds the newest wrapper.
  getTable: () => DataGridTableInstance<TData>
): DataGridAutoSizeController {
  let applied: { base: number; columnId: string; grown: number } | null = null

  return {
    apply(fillWidth: number) {
      const table = getTable()
      const columnSizing = table.state.columnSizing

      // Re-arm after reset flows (double-click resetSize, resetColumnSizing,
      // controlled state replacement) so the column re-fills instead of
      // leaving a dead blank strip.
      if (applied && columnSizing[applied.columnId] === undefined) {
        applied = null
      }

      if (fillWidth <= 0) return false

      const autoSizeColumn = table
        .getVisibleLeafColumns()
        .find(
          (column) => column.columnDef.meta?.autoSize && column.getCanResize()
        )

      if (!autoSizeColumn || applied?.columnId === autoSizeColumn.id) {
        return false
      }

      // Candidate switched (e.g. the grown column was hidden and another
      // meta.autoSize column took over): revert the previous growth if the
      // user hasn't manually resized that column since, so visibility
      // toggles cannot ratchet the table wider than its container forever.
      const revert =
        applied && columnSizing[applied.columnId] === applied.grown
          ? applied
          : null
      const base = columnSizing[autoSizeColumn.id] ?? autoSizeColumn.getSize()
      const grown = base + fillWidth

      applied = { columnId: autoSizeColumn.id, base, grown }
      table.setColumnSizing((old) => {
        const next = { ...old, [autoSizeColumn.id]: grown }
        if (revert && next[revert.columnId] === revert.grown) {
          next[revert.columnId] = revert.base
        }
        return next
      })

      return true
    },
  }
}

export type DataGridRequestParams = {
  columnFilters?: ColumnFiltersState
  pageIndex: number
  pageSize: number
  sorting?: SortingState
}

export interface DataGridProps<TData extends RowData> {
  allRowsLoadedMessage?: ReactNode | string
  children?: ReactNode
  className?: string
  emptyMessage?: ReactNode | string
  fetchingMoreMessage?: ReactNode | string
  isLoading?: boolean
  loadingMessage?: ReactNode | string
  loadingMode?: "skeleton" | "spinner"
  onRowClick?: (row: TData) => void
  recordCount: number
  table?: DataGridTableInstance<TData>
  tableClassNames?: {
    base?: string
    body?: string
    bodyRow?: string
    edgeCell?: string
    footer?: string
    header?: string
    headerRow?: string
    headerSticky?: string
  }
  tableLayout?: {
    cellBorder?: boolean
    columnsDraggable?: boolean
    columnsMovable?: boolean
    columnsPinnable?: boolean
    columnsResizable?: boolean
    columnsResizeMode?: "onChange" | "onEnd"
    columnsVisibility?: boolean
    dense?: boolean
    footerBackground?: boolean
    headerBackground?: boolean
    headerBorder?: boolean
    headerSticky?: boolean
    rowBorder?: boolean
    rowRounded?: boolean
    rowsDraggable?: boolean
    rowsPinnable?: boolean
    stripped?: boolean
    width?: "auto" | "fixed"
  }
}

/**
 * The context is row-type erased on purpose: one provider serves grids of
 * every row shape, and each renderer re-narrows `TData` at its own boundary.
 *
 * v9 declares `Table<in out TFeatures, in out TData>`, making `TData`
 * invariant — so unlike v8, a `Table<F, Post>` is not assignable to a
 * `Table<F, any>` and the erasure can no longer happen implicitly. It is done
 * once, explicitly, in `DataGridProvider` below rather than at each of the
 * consumers.
 */
const DataGridContext = createContext<
  DataGridContextProps<any> | undefined
>(undefined)

function useDataGrid() {
  const context = useContext(DataGridContext)
  if (!context) {
    throw new Error("useDataGrid must be used within a DataGridProvider")
  }
  return context
}

/**
 * `useDataGrid` re-narrowed to the row type of the component reading it.
 *
 * The counterpart to the erasure in `DataGridProvider`: because v9's `TData`
 * is invariant, a component holding `Row<F, TData>`/`Header<F, TData>` values
 * cannot mix them with the erased context table in either direction. Use this
 * in components that pass context state back into row-typed APIs; plain
 * `useDataGrid()` is fine for everything that only reads `props`.
 */
function useDataGridOf<TData extends RowData>() {
  return useDataGrid() as DataGridContextProps<TData>
}

function DataGridProvider<TData extends RowData>({
  children,
  table,
  ...props
}: DataGridProps<TData> & { table: DataGridTableInstance<TData> }) {
  const tableState = table.state

  // Latest-props ref: context reads always resolve fresh props through the
  // getter below without the memoized context value depending on unstable
  // ReactNode/function prop identities (inline emptyMessage/onRowClick would
  // otherwise publish a new context value on every consumer render - at
  // mousemove rate during a resize drag, piercing the body-rows memo).
  const propsRef = useRef(props)
  propsRef.current = props

  // Latest-table ref, for exactly the same reason. Under v8 the table instance
  // was stable, so depending on it was free. v9's `useTable` returns
  // `useMemo(() => ({ ...table, options, state }), [table, tableOptions, state])`
  // and `tableOptions` is a fresh object literal on every consumer render, so
  // the wrapper identity now churns constantly. Keeping it out of the memo
  // deps below is what preserves the resize-drag guarantee those comments
  // describe; the underlying core instance is stable, so serving the newest
  // wrapper through a getter loses nothing.
  const tableRef = useRef(table)
  tableRef.current = table

  // Re-assert an explicit tableLayout resize mode so consumer-level useTable
  // options cannot flip it back between drags. This used to be a render-phase
  // mutation of `table.options`, which v9 no longer honours: the wrapper's
  // `options` is the consumer's own literal, and the core table has already
  // resolved its copy by the time we could touch it. It goes through
  // `setOptions` in an effect now. Without an explicit mode, the consumer's
  // own tanstack columnResizeMode is honored.
  const resizeMode =
    props.tableLayout?.columnsResizable && props.tableLayout.columnsResizeMode
      ? props.tableLayout.columnsResizeMode
      : undefined

  useEffect(() => {
    if (!resizeMode) return
    if (table.options.columnResizeMode === resizeMode) return
    table.setOptions((old) => ({ ...old, columnResizeMode: resizeMode }))
  }, [table, resizeMode])

  // One autoSize coordinator per grid so split header/body viewports cannot
  // apply the growth twice. Created once: rebuilding it would reset the
  // "applied at most once per column" guard, and a column-visibility toggle
  // could then ratchet the table wider on every pass.
  const autoSize = useMemo(
    () => createDataGridAutoSizeController(() => tableRef.current),
    []
  )

  // Memoize context value so consumers don't re-render during column resize.
  // Column sizing state is intentionally excluded from deps -- CSS variables
  // on the <table> element handle width updates without React re-renders.
  // ReactNode/function props (messages, onRowClick) are also excluded: they
  // are served fresh through the props getter, so unstable inline identities
  // cannot invalidate the context value.
  const value = useMemo<DataGridContextProps<any>>(
    () => ({
      get props() {
        return propsRef.current
      },
      // Served through the ref, and the one row-type erasure — see the notes
      // on `tableRef` and on the context itself.
      get table() {
        return tableRef.current as DataGridTableInstance<any>
      },
      recordCount: props.recordCount,
      isLoading: props.isLoading || false,
      autoSize,
    }),
    [
      autoSize,
      props.recordCount,
      props.isLoading,
      props.loadingMode,
      props.className,
      JSON.stringify(props.tableLayout),
      JSON.stringify(props.tableClassNames),
      tableState.sorting,
      tableState.pagination,
      tableState.columnFilters,
      tableState.rowSelection,
      tableState.rowPinning,
      tableState.expanded,
      tableState.columnVisibility,
      tableState.columnOrder,
      tableState.columnPinning,
      tableState.globalFilter,
    ]
  )

  return (
    <DataGridContext.Provider value={value}>
      {children}
    </DataGridContext.Provider>
  )
}

function DataGrid<TData extends RowData>({
  children,
  table,
  ...props
}: DataGridProps<TData>) {
  const defaultProps: Partial<DataGridProps<TData>> = {
    loadingMode: "skeleton",
    tableLayout: {
      dense: false,
      cellBorder: false,
      rowBorder: true,
      rowRounded: false,
      stripped: false,
      headerSticky: false,
      // DASHBOARD SKIN (re-apply after a ReUI merge): upstream defaults both of
      // these to `false`. Our grids sit on the page background, so a tinted
      // header is what separates column labels from the first row.
      headerBackground: true,
      footerBackground: false,
      headerBorder: true,
      width: "fixed",
      columnsVisibility: false,
      columnsResizable: false,
      // columnsResizeMode has no default on purpose: when unset, the
      // consumer's tanstack columnResizeMode (default "onEnd") is honored.
      columnsPinnable: false,
      columnsMovable: false,
      columnsDraggable: false,
      rowsDraggable: false,
      rowsPinnable: false,
    },
    tableClassNames: {
      base: "",
      header: "",
      headerRow: "",
      // z-40 keeps the sticky header above pinned body cells (zIndex 30 in
      // getPinningStyles), which would otherwise paint over it while
      // scrolling vertically with columnsPinnable enabled.
      headerSticky: "sticky top-0 z-40 bg-background/90 backdrop-blur-xs",
      body: "",
      bodyRow: "",
      footer: "",
      edgeCell: "",
    },
  }

  const mergedProps: DataGridProps<TData> = {
    ...defaultProps,
    ...props,
    tableLayout: {
      ...defaultProps.tableLayout,
      ...(props.tableLayout || {}),
    },
    tableClassNames: {
      ...defaultProps.tableClassNames,
      ...(props.tableClassNames || {}),
    },
  }

  // Ensure table is provided
  if (!table) {
    throw new Error('DataGrid requires a "table" prop')
  }

  return (
    <DataGridProvider table={table} {...mergedProps}>
      {children}
    </DataGridProvider>
  )
}

function DataGridContainer({
  children,
  className,
  border = true,
}: {
  /**
   * DASHBOARD SKIN (re-apply after a ReUI merge): upstream turned this prop
   * into a no-op and dropped the border entirely. Here it still draws the
   * card edge every grid in this app sits inside, so it stays functional and
   * defaults on — pass `border={false}` for a bare grid.
   */
  border?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="data-grid"
      className={cn(
        "w-full overflow-hidden",
        border && "border-border rounded-lg border",
        className
      )}
    >
      {children}
    </div>
  )
}

export {
  DataGrid,
  DataGridContainer,
  DataGridProvider,
  useDataGrid,
  useDataGridOf,
}
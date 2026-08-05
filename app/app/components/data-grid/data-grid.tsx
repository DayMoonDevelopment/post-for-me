import type {
  Column,
  ColumnFiltersState,
  RowData,
  SortingState,
  Table,
} from "@tanstack/react-table"
import type { ReactNode } from "react"

import { createContext, useContext, useMemo, useRef } from "react"

import { cn } from "~/lib/utils"

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    autoSize?: boolean
    cellClassName?: string
    expandedContent?: (row: TData) => ReactNode
    headerClassName?: string
    headerTitle?: string
    skeleton?: ReactNode
  }
}

/** Label for headers / column visibility: `meta.headerTitle`, string `columnDef.header`, or `column.id`. */
export function getColumnHeaderLabel<TData, TValue>(
  column: Column<TData, TValue>
): string {
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

export interface DataGridContextProps<TData extends object> {
  /**
   * Internal coordinator for `meta.autoSize` columns. Lives at the core level
   * so every table variant and viewport instance shares one application state.
   */
  autoSize?: DataGridAutoSizeController
  isLoading: boolean
  props: DataGridProps<TData>
  recordCount: number
  table: Table<TData>
}

export type DataGridAutoSizeController = {
  /**
   * Grows the first visible `meta.autoSize` column by the given free space.
   * Applies at most once per column id; safe to call from every viewport
   * measurement. Returns true when a sizing update was dispatched.
   */
  apply: (fillWidth: number) => boolean
}

function createDataGridAutoSizeController<TData extends object>(
  table: Table<TData>
): DataGridAutoSizeController {
  let applied: { base: number; columnId: string; grown: number } | null = null

  return {
    apply(fillWidth: number) {
      const columnSizing = table.getState().columnSizing

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

export interface DataGridProps<TData extends object> {
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
  table?: Table<TData>
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

function DataGridProvider<TData extends object>({
  children,
  table,
  ...props
}: DataGridProps<TData> & { table: Table<TData> }) {
  const tableState = table.getState()

  // Latest-props ref: context reads always resolve fresh props through the
  // getter below without the memoized context value depending on unstable
  // ReactNode/function prop identities (inline emptyMessage/onRowClick would
  // otherwise publish a new context value on every consumer render - at
  // mousemove rate during a resize drag, piercing the body-rows memo).
  const propsRef = useRef(props)
  propsRef.current = props

  // Re-assert an explicit tableLayout resize mode every render so
  // consumer-level useReactTable options cannot flip it back between drags.
  // Without one, the consumer's own tanstack columnResizeMode (default
  // "onEnd") is honored.
  if (
    props.tableLayout?.columnsResizable &&
    props.tableLayout.columnsResizeMode
  ) {
    table.options.columnResizeMode = props.tableLayout.columnsResizeMode
  }

  // One autoSize coordinator per table instance so split header/body viewports
  // cannot apply the growth twice.
  const autoSize = useMemo(
    () => createDataGridAutoSizeController(table),
    [table]
  )

  // Memoize context value so consumers don't re-render during column resize.
  // Column sizing state is intentionally excluded from deps -- CSS variables
  // on the <table> element handle width updates without React re-renders.
  // ReactNode/function props (messages, onRowClick) are also excluded: they
  // are served fresh through the props getter, so unstable inline identities
  // cannot invalidate the context value.
  const value = useMemo(
    () => ({
      get props() {
        return propsRef.current
      },
      table,
      recordCount: props.recordCount,
      isLoading: props.isLoading || false,
      autoSize,
    }),
    [
      table,
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

function DataGrid<TData extends object>({
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

export { DataGrid, DataGridContainer, DataGridProvider, useDataGrid }
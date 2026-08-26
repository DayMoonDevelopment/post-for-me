import type { CellData, Column, RowData } from "@tanstack/react-table"
import type { HTMLAttributes, ReactNode } from "react"

import { memo, useMemo } from "react"
import { useTranslation } from "react-i18next";

import type {
  DataGridFeatures,
} from "~/components/data-grid/data-grid"

import {
  getColumnHeaderLabel,
  useDataGrid,
} from "~/components/data-grid/data-grid"
import { ArrowDownIcon, ArrowLeftIcon, ArrowToLineLeftIcon as ArrowLeftToLineIcon, ArrowRightIcon, ArrowToLineRightIcon as ArrowRightToLineIcon, ArrowUpIcon, CheckIcon, ExpandIcon as ChevronsUpDownIcon, UnpinIcon as PinOffIcon, SlidersIcon as Settings2Icon } from "~/icons"
import { cn } from "~/lib/utils"
import { Button } from "~/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/ui/dropdown-menu"

interface DataGridColumnHeaderProps<
  TData extends RowData,
  TValue extends CellData,
> extends HTMLAttributes<HTMLDivElement> {
  column: Column<DataGridFeatures, TData, TValue>
  filter?: ReactNode
  icon?: ReactNode
  /** Reserved; pin controls are gated by tableLayout.columnsPinnable + column.getCanPin(). */
  pinnable?: boolean
  /** When omitted, uses `column.columnDef.meta.headerTitle`, then a string `columnDef.header`, then `column.id`. */
  title?: string
  visibility?: boolean
}

function DataGridColumnHeaderInner<TData extends RowData, TValue extends CellData>({
  column,
  title,
  icon,
  className,
  filter,
  visibility = false,
}: DataGridColumnHeaderProps<TData, TValue>) {
  const { t } = useTranslation();
  const { isLoading, table, props, recordCount } = useDataGrid()
  const resolvedTitle = title ?? getColumnHeaderLabel(column)

  // TanStack's columnOrder defaults to [] until a consumer seeds it; fall
  // back to the definition order so Move Left/Right work out of the box.
  const columnOrderState = table.state.columnOrder
  const columnOrder =
    columnOrderState.length > 0
      ? columnOrderState
      : table.getAllLeafColumns().map((leafColumn) => leafColumn.id)
  const columnVisibilityKey =
    props.tableLayout?.columnsVisibility && visibility
      ? JSON.stringify(table.state.columnVisibility)
      : ""
  const isSorted = column.getIsSorted()
  const isPinned = column.getIsPinned()
  const canSort = column.getCanSort()
  const canPin = column.getCanPin()
  const canResize = column.getCanResize()

  const columnIndex = columnOrder.indexOf(column.id)
  const canMoveLeft = columnIndex > 0
  const canMoveRight = columnIndex < columnOrder.length - 1

  const handleSort = () => {
    if (isSorted === "asc") {
      column.toggleSorting(true)
    } else if (isSorted === "desc") {
      column.clearSorting()
    } else {
      column.toggleSorting(false)
    }
  }

  const headerLabelClassName = cn(
    "text-secondary-foreground/80 inline-flex h-full items-center gap-1.5 font-normal [&_svg]:opacity-60 text-xs/relaxed [&_svg]:size-3",
    className
  )

  const headerButtonClassName = cn(
    "text-secondary-foreground/80 hover:bg-secondary data-[state=open]:bg-secondary hover:text-foreground data-[state=open]:text-foreground -ms-2 px-2 font-normal h-6 rounded-md",
    className
  )

  const sortIcon =
    canSort &&
    (isSorted === "desc" ? (
      <ArrowDownIcon className="size-3.25" aria-hidden="true" />
    ) : isSorted === "asc" ? (
      <ArrowUpIcon className="size-3.25" aria-hidden="true" />
    ) : (
      <ChevronsUpDownIcon className="mt-px size-3.25" aria-hidden="true" />
    ))

  const hasControls =
    props.tableLayout?.columnsMovable ||
    (props.tableLayout?.columnsVisibility && visibility) ||
    (props.tableLayout?.columnsPinnable && canPin) ||
    filter

  const menuItems = useMemo(() => {
    const items: ReactNode[] = []
    let hasPreviousSection = false

    // Filter section
    if (filter) {
      items.push(
        <DropdownMenuGroup key="group-filter">
          <DropdownMenuLabel key="filter">{filter}</DropdownMenuLabel>
        </DropdownMenuGroup>
      )
      hasPreviousSection = true
    }

    // Sort section
    if (canSort) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-sort" />)
      }
      items.push(
        <DropdownMenuItem
          key="sort-asc"
          onClick={() => {
            if (isSorted === "asc") {
              column.clearSorting()
            } else {
              column.toggleSorting(false)
            }
          }}
          disabled={!canSort}
        >
          <ArrowUpIcon className="size-3.5!" />
          <span className="grow">{t("dataGrid.sortAsc")}</span>
          {isSorted === "asc" ? <CheckIcon className="text-primary size-4 opacity-100!" /> : null}
        </DropdownMenuItem>,
        <DropdownMenuItem
          key="sort-desc"
          onClick={() => {
            if (isSorted === "desc") {
              column.clearSorting()
            } else {
              column.toggleSorting(true)
            }
          }}
          disabled={!canSort}
        >
          <ArrowDownIcon className="size-3.5!" />
          <span className="grow">{t("dataGrid.sortDesc")}</span>
          {isSorted === "desc" ? <CheckIcon className="text-primary size-4 opacity-100!" /> : null}
        </DropdownMenuItem>
      )
      hasPreviousSection = true
    }

    // Pin section
    if (props.tableLayout?.columnsPinnable && canPin) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-pin" />)
      }
      // The pin targets are v9's logical regions now ("start"/"end"), while
      // the labels and icons stay physical — unchanged in LTR, which is what
      // these strings are written for. Making the copy direction-aware is an
      // i18n change, not part of this port.
      items.push(
        <DropdownMenuItem
          key="pin-start"
          onClick={() => column.pin(isPinned === "start" ? false : "start")}
        >
          <ArrowLeftToLineIcon className="size-3.5!" aria-hidden="true" />
          <span className="grow">{t("dataGrid.pinLeft")}</span>
          {isPinned === "start" ? <CheckIcon className="text-primary size-4 opacity-100!" /> : null}
        </DropdownMenuItem>,
        <DropdownMenuItem
          key="pin-end"
          onClick={() => column.pin(isPinned === "end" ? false : "end")}
        >
          <ArrowRightToLineIcon className="size-3.5!" aria-hidden="true" />
          <span className="grow">{t("dataGrid.pinRight")}</span>
          {isPinned === "end" ? <CheckIcon className="text-primary size-4 opacity-100!" /> : null}
        </DropdownMenuItem>
      )
      hasPreviousSection = true
    }

    // Move section
    if (props.tableLayout?.columnsMovable) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-move" />)
      }
      items.push(
        <DropdownMenuItem
          key="move-left"
          onClick={() => {
            if (columnIndex > 0) {
              const newOrder = [...columnOrder]
              const [movedColumn] = newOrder.splice(columnIndex, 1)
              newOrder.splice(columnIndex - 1, 0, movedColumn)
              table.setColumnOrder(newOrder)
            }
          }}
          disabled={!canMoveLeft || isPinned !== false}
        >
          <ArrowLeftIcon className="size-3.5!" aria-hidden="true" />
          <span>{t("dataGrid.moveLeft")}</span>
        </DropdownMenuItem>,
        <DropdownMenuItem
          key="move-right"
          onClick={() => {
            if (columnIndex < columnOrder.length - 1) {
              const newOrder = [...columnOrder]
              const [movedColumn] = newOrder.splice(columnIndex, 1)
              newOrder.splice(columnIndex + 1, 0, movedColumn)
              table.setColumnOrder(newOrder)
            }
          }}
          disabled={!canMoveRight || isPinned !== false}
        >
          <ArrowRightIcon className="size-3.5!" aria-hidden="true" />
          <span>{t("dataGrid.moveRight")}</span>
        </DropdownMenuItem>
      )
      hasPreviousSection = true
    }

    // Visibility section
    if (props.tableLayout?.columnsVisibility && visibility) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-visibility" />)
      }
      items.push(
        <DropdownMenuSub key="visibility">
          <DropdownMenuSubTrigger>
            <Settings2Icon className="size-3.5!" />
            <span>{t("dataGrid.columns")}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent side="inline-end">
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(value) => col.toggleVisibility(!!value)}
                  className="capitalize"
                >
                  {getColumnHeaderLabel(col)}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )
    }

    return items
  }, [
    filter,
    canSort,
    isSorted,
    column,
    props.tableLayout?.columnsPinnable,
    props.tableLayout?.columnsMovable,
    props.tableLayout?.columnsVisibility,
    canPin,
    isPinned,
    canMoveLeft,
    canMoveRight,
    visibility,
    table,
    columnIndex,
    columnOrder,
    columnVisibilityKey, // Needed to update checkbox states when visibility changes
  ])

  if (hasControls) {
    return (
      <div className="-ms-2 flex h-full items-center justify-between gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className={headerButtonClassName}
                disabled={isLoading || recordCount === 0}
              >
                {icon ? icon : null}
                {resolvedTitle}
                {sortIcon}
              </Button>
            }
          />
          <DropdownMenuContent className="w-40" align="start">
            {menuItems}
          </DropdownMenuContent>
        </DropdownMenu>
        {props.tableLayout?.columnsPinnable && canPin && isPinned ? <Button
            size="icon-sm"
            variant="ghost"
            className="rounded-md -me-1 size-7"
            onClick={() => column.pin(false)}
            aria-label={`Unpin ${resolvedTitle} column`}
            title={`Unpin ${resolvedTitle} column`}
          >
            <PinOffIcon className="size-3.5! opacity-50!" aria-hidden="true" />
          </Button> : null}
      </div>
    )
  }

  if (canSort || (props.tableLayout?.columnsResizable && canResize)) {
    return (
      <div className="-ms-2 flex h-full items-center">
        <Button
          variant="ghost"
          className={headerButtonClassName}
          disabled={isLoading || recordCount === 0}
          onClick={handleSort}
        >
          {icon ? icon : null}
          {resolvedTitle}
          {sortIcon}
        </Button>
      </div>
    )
  }

  return (
    <div className={headerLabelClassName}>
      {icon ? icon : null}
      {resolvedTitle}
    </div>
  )
}

/**
 * LOAD-BEARING COUPLING — sort/pin state reaches this header through builder
 * calls on `column` (`getIsSorted()`, `getIsPinned()`), and `column` is a
 * stable reference, so `memo` sees unchanged props on every state change and
 * would skip the render. What saves it is context: this component consumes
 * `useDataGrid()`, and the provider republishes its value whenever `sorting`,
 * `columnPinning`, `columnVisibility`, or `columnOrder` change — a context
 * change re-renders a memoized consumer even when props are equal.
 *
 * Dropping any of those four slices from the context memo deps in
 * `data-grid.tsx` would therefore silently freeze the sort arrows and pin
 * controls here, with no type error. Upstream ReUI instead wraps this in a
 * `Subscribe` over exactly those four slices, making the dependency explicit
 * and narrowing the re-render to headers; worth adopting if the context dep
 * list is ever trimmed for performance.
 */
const DataGridColumnHeader = memo(
  DataGridColumnHeaderInner
) as typeof DataGridColumnHeaderInner

export { DataGridColumnHeader, type DataGridColumnHeaderProps }
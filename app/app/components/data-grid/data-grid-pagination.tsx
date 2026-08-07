import type { JSX, ReactNode } from "react"

import { useDataGrid } from "~/components/data-grid/data-grid"
import { ChevronLeftIcon, ChevronRightIcon } from "~/icons"
import { cn } from "~/lib/utils"
import { Button } from "~/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/select"
import { Skeleton } from "~/ui/skeleton"

interface DataGridPaginationProps {
  className?: string
  ellipsisText?: string
  info?: string
  infoSkeleton?: ReactNode
  more?: boolean
  moreLimit?: number
  nextPageLabel?: string
  previousPageLabel?: string
  rowsPerPageLabel?: string
  sizes?: number[]
  sizesDescription?: string
  sizesInfo?: string
  sizesLabel?: string
  sizesSkeleton?: ReactNode
}

function DataGridPagination(props: DataGridPaginationProps): JSX.Element {
  const { table, recordCount, isLoading } = useDataGrid()

  const defaultProps: Partial<DataGridPaginationProps> = {
    sizes: [5, 10, 25, 50, 100],
    sizesSkeleton: <Skeleton className="h-8 w-44" />,
    moreLimit: 5,
    info: "{from} - {to} of {count}",
    infoSkeleton: <Skeleton className="h-8 w-60" />,
    rowsPerPageLabel: "Rows per page",
    previousPageLabel: "Go to previous page",
    nextPageLabel: "Go to next page",
    ellipsisText: "...",
  }

  const mergedProps: DataGridPaginationProps = { ...defaultProps, ...props }

  // DASHBOARD SKIN (re-apply after a ReUI merge): upstream leaves the page
  // buttons unsized. `size-7` keeps them on the dashboard's compact control
  // scale, matching the tighter cell padding.
  const btnBaseClasses = "size-7 p-0 text-sm"
  const btnArrowClasses = btnBaseClasses + " rtl:transform rtl:rotate-180"
  const pageIndex = table.store.state.pagination.pageIndex
  const pageSize = table.store.state.pagination.pageSize
  const from = recordCount === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, recordCount)
  const pageCount = table.getPageCount()

  // Replace placeholders in paginationInfo
  const paginationInfo = mergedProps.info
    ? mergedProps.info
        .replaceAll("{from}", from.toString())
        .replaceAll("{to}", to.toString())
        .replaceAll("{count}", recordCount.toString())
    : `${from} - ${to} of ${recordCount}`

  // Pagination limit logic
  const paginationMoreLimit = mergedProps.moreLimit || 5

  // Determine the start and end of the pagination group
  const currentGroupStart =
    Math.floor(pageIndex / paginationMoreLimit) * paginationMoreLimit
  const currentGroupEnd = Math.min(
    currentGroupStart + paginationMoreLimit,
    pageCount
  )

  // Render page buttons based on the current group
  const renderPageButtons = () => {
    const buttons = []
    for (let i = currentGroupStart; i < currentGroupEnd; i++) {
      buttons.push(
        <Button
          key={i}
          size="icon-sm"
          variant="ghost"
          className={cn(btnBaseClasses, "text-muted-foreground", {
            "bg-accent text-accent-foreground": pageIndex === i,
          })}
          onClick={() => {
            if (pageIndex !== i) {
              table.setPageIndex(i)
            }
          }}
        >
          {i + 1}
        </Button>
      )
    }
    return buttons
  }

  // Render a "previous" ellipsis button if there are previous pages to show
  const renderEllipsisPrevButton = () => {
    if (currentGroupStart > 0) {
      return (
        <Button
          size="icon-sm"
          className={btnBaseClasses}
          variant="ghost"
          onClick={() => table.setPageIndex(currentGroupStart - 1)}
        >
          {mergedProps.ellipsisText}
        </Button>
      )
    }
    return null
  }

  // Render a "next" ellipsis button if there are more pages to show after the current group
  const renderEllipsisNextButton = () => {
    if (currentGroupEnd < pageCount) {
      return (
        <Button
          className={btnBaseClasses}
          variant="ghost"
          size="icon-sm"
          onClick={() => table.setPageIndex(currentGroupEnd)}
        >
          {mergedProps.ellipsisText}
        </Button>
      )
    }
    return null
  }

  return (
    <div
      data-slot="data-grid-pagination"
      className={cn(
        // DASHBOARD SKIN: `px-2.5` matches our table cell padding so the
        // out-of-container footer (rows-per-page + count) lines up with the
        // grid's column content. Upstream ships no horizontal padding.
        "flex grow flex-col flex-wrap items-center justify-between gap-2.5 px-2.5 py-2.5 sm:flex-row sm:py-0",
        mergedProps.className
      )}
    >
      <div className="order-2 flex flex-wrap items-center space-x-2.5 rtl:space-x-reverse pb-2.5 sm:order-1 sm:pb-0">
        {isLoading ? (
          mergedProps.sizesSkeleton
        ) : (
          <>
            <div className="text-muted-foreground text-xs/relaxed">
              {mergedProps.rowsPerPageLabel}
            </div>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                const newPageSize = Number(value)
                table.setPageSize(newPageSize)
              }}
            >
              <SelectTrigger className="w-14" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                align="start"
                alignItemWithTrigger={false}
                className="min-w-(--anchor-width)"
              >
                {mergedProps.sizes?.map((size: number) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
      <div className="order-1 flex flex-col items-center justify-center gap-2.5 pt-2.5 sm:order-2 sm:flex-row sm:justify-end sm:pt-0">
        {isLoading ? (
          mergedProps.infoSkeleton
        ) : (
          <>
            <div className="text-muted-foreground text-xs/relaxed order-2 text-nowrap sm:order-1">
              {paginationInfo}
            </div>
            {pageCount > 1 ? <div className="order-1 flex items-center space-x-1 rtl:space-x-reverse">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className={btnArrowClasses}
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">
                    {mergedProps.previousPageLabel}
                  </span>
                  <ChevronLeftIcon className="size-4" />
                </Button>

                {renderEllipsisPrevButton()}

                {renderPageButtons()}

                {renderEllipsisNextButton()}

                <Button
                  size="icon-sm"
                  variant="ghost"
                  className={btnArrowClasses}
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">{mergedProps.nextPageLabel}</span>
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div> : null}
          </>
        )}
      </div>
    </div>
  )
}

export { DataGridPagination, type DataGridPaginationProps }
import type { Column } from "@tanstack/react-table"

import { useMemo, useState } from "react"

import { CheckIcon, CirclePlusIcon } from "~/icons"
import { cn } from "~/lib/utils"
import { Badge } from "~/ui/badge"
import { Button } from "~/ui/button"
import { Input } from "~/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/ui/popover"
import { Separator } from "~/ui/separator"

interface DataGridColumnFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
  options: {
    icon?: React.ComponentType<{ className?: string }>
    label: string
    value: string
  }[]
  title?: string
}

function DataGridColumnFilter<TData, TValue>({
  column,
  title,
  options,
}: DataGridColumnFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues()
  const filterValue = column?.getFilterValue()
  const selectedValues = new Set(
    Array.isArray(filterValue) ? (filterValue as string[]) : []
  )
  const [searchQuery, setSearchQuery] = useState("")

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [options, searchQuery])

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm">
            <CirclePlusIcon className="size-4" />
            {title}
            {selectedValues?.size > 0 ? <>
                <Separator orientation="vertical" className="mx-2 h-4" />
                <Badge
                  variant="secondary"
                  className="px-1 font-normal lg:hidden"
                >
                  {selectedValues.size}
                </Badge>
                <div className="hidden space-x-1 rtl:space-x-reverse lg:flex">
                  {selectedValues.size > 2 ? (
                    <Badge variant="secondary" className="px-1 font-normal">
                      {selectedValues.size} selected
                    </Badge>
                  ) : (
                    options
                      .filter((option) => selectedValues.has(option.value))
                      .map((option) => (
                        <Badge
                          variant="secondary"
                          key={option.value}
                          className="px-1 font-normal"
                        >
                          {option.label}
                        </Badge>
                      ))
                  )}
                </div>
              </> : null}
          </Button>
        }
      />
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="p-2">
          <Input
            placeholder={title}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="text-muted-foreground py-6 text-center text-sm">
              No results found.
            </div>
          ) : (
            <div className="p-1">
              {filteredOptions.map((option) => {
                const isSelected = selectedValues.has(option.value)
                const facetCount = facets?.get(option.value)
                const toggleOption = () => {
                  if (isSelected) {
                    selectedValues.delete(option.value)
                  } else {
                    selectedValues.add(option.value)
                  }
                  const filterValues = Array.from(selectedValues)
                  column?.setFilterValue(
                    filterValues.length ? filterValues : undefined
                  )
                }
                return (
                  <div
                    key={option.value}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onClick={toggleOption}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        toggleOption()
                      }
                    }}
                    className={cn(
                      "rounded-md relative flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm outline-hidden select-none",
                      "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "border-primary rounded-sm flex h-4 w-4 items-center justify-center border",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </div>
                    {option.icon ? <option.icon className="text-muted-foreground h-4 w-4" /> : null}
                    <span>{option.label}</span>
                    {facetCount !== undefined ? <span className="ms-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                        {facetCount}
                      </span> : null}
                  </div>
                )
              })}
            </div>
          )}
          {selectedValues.size > 0 ? <>
              <div className="bg-border -mx-1 my-1 h-px" />
              <div className="p-1">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => column?.setFilterValue(undefined)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      column?.setFilterValue(undefined)
                    }
                  }}
                  className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground rounded-md relative flex cursor-pointer items-center justify-center px-2 py-1.5 text-sm outline-hidden select-none"
                >
                  Clear filters
                </div>
              </div>
            </> : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DataGridColumnFilter, type DataGridColumnFilterProps }
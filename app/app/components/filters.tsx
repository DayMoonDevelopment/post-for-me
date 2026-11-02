import type React from "react"

import { useRender } from "@base-ui/react/use-render"
import { cva } from "class-variance-authority"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"

import { AlertCircleIcon, CheckIcon, CloseIcon } from "~/icons"
import { cn } from "~/lib/utils"
import { Button } from "~/ui/button"
import {
  ButtonGroup,
  ButtonGroupText,
} from "~/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/ui/dropdown-menu"
import { Input } from "~/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "~/ui/input-group"
import { Kbd } from "~/ui/kbd"
import { ScrollArea } from "~/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/ui/tooltip"

// i18n Configuration Interface
export interface FilterI18nConfig {
  // UI Labels
  addFilter: string
  addFilterTitle: string
  defaultColor: string
  defaultCurrency: string
  false: string
  // Helper functions
  helpers: {
    formatOperator: (operator: string) => string
  }
  max: string
  min: string
  noFieldsFound: string
  noResultsFound: string
  // Operators
  operators: {
    after: string
    before: string
    between: string
    contains: string
    empty: string
    endsWith: string
    equals: string
    excludes: string
    excludesAll: string
    greaterThan: string
    includes: string
    includesAll: string
    includesAllOf: string
    includesAnyOf: string
    is: string
    isAnyOf: string
    isExactly: string
    isNot: string
    isNotAnyOf: string
    lessThan: string
    notBetween: string
    notContains: string
    notEmpty: string
    notEquals: string
    overlaps: string
    startsWith: string
  }
  percent: string
  // Placeholders
  placeholders: {
    enterField: (fieldType: string) => string
    enterKey: string
    enterValue: string
    searchField: (fieldName: string) => string
    selectField: string
  }
  searchFields: string
  select: string
  selected: string
  selectedCount: string

  to: string

  true: string

  typeAndPressEnter: string

  // Validation
  validation: {
    invalid: string
    invalidEmail: string
    invalidTel: string
    invalidUrl: string
  }
}

// Default English i18n configuration
export const DEFAULT_I18N: FilterI18nConfig = {
  // UI Labels
  addFilter: "Filter",
  searchFields: "Filter...",
  noFieldsFound: "No filters found.",
  noResultsFound: "No results found.",
  select: "Select...",
  true: "True",
  false: "False",
  min: "Min",
  max: "Max",
  to: "to",
  typeAndPressEnter: "Type and press Enter to add tag",
  selected: "selected",
  selectedCount: "selected",
  percent: "%",
  defaultCurrency: "$",
  defaultColor: "#000000",
  addFilterTitle: "Add filter",

  // Operators
  operators: {
    is: "is",
    isNot: "is not",
    isAnyOf: "is any of",
    isNotAnyOf: "is not any of",
    includesAll: "includes all",
    excludesAll: "excludes all",
    before: "before",
    after: "after",
    between: "between",
    notBetween: "not between",
    contains: "contains",
    notContains: "does not contain",
    startsWith: "starts with",
    endsWith: "ends with",
    isExactly: "is exactly",
    equals: "equals",
    notEquals: "not equals",
    greaterThan: "greater than",
    lessThan: "less than",
    overlaps: "overlaps",
    includes: "includes",
    excludes: "excludes",
    includesAllOf: "includes all of",
    includesAnyOf: "includes any of",
    empty: "is empty",
    notEmpty: "is not empty",
  },

  // Placeholders
  placeholders: {
    enterField: (fieldType: string) => `Enter ${fieldType}...`,
    selectField: "Select...",
    searchField: (fieldName: string) => `Search ${fieldName.toLowerCase()}...`,
    enterKey: "Enter key...",
    enterValue: "Enter value...",
  },

  // Helper functions
  helpers: {
    formatOperator: (operator: string) => operator.replace(/_/g, " "),
  },

  // Validation
  validation: {
    invalidEmail: "Invalid email format",
    invalidUrl: "Invalid URL format",
    invalidTel: "Invalid phone format",
    invalid: "Invalid input format",
  },
}

// Context for all Filter component props
interface FilterContextValue {
  allowMultiple?: boolean
  className?: string
  i18n: FilterI18nConfig
  radius: "default" | "full"
  showSearchInput?: boolean
  size: "sm" | "default" | "lg"
  trigger?: React.ReactNode
  variant: "solid" | "default"
}

const FilterContext = createContext<FilterContextValue>({
  variant: "default",
  size: "default",
  radius: "default",
  i18n: DEFAULT_I18N,
  className: undefined,
  showSearchInput: true,
  trigger: undefined,
  allowMultiple: true,
})

const useFilterContext = () => useContext(FilterContext)

// Container variant for filters wrapper
const filtersContainerVariants = cva("flex flex-wrap items-center", {
  variants: {
    variant: {
      solid: "gap-2",
      default: "",
    },
    size: {
      sm: "gap-1.5",
      default: "gap-2.5",
      lg: "gap-3.5",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

function FilterInput<T = unknown>({
  field,
  onBlur,
  onKeyDown,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string
  field?: FilterFieldConfig<T>
}) {
  const context = useFilterContext()
  const [isValid, setIsValid] = useState(true)
  const [validationMessage, setValidationMessage] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (props.autoFocus) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [props.autoFocus])

  // Validation function to check if input matches pattern
  const validateInput = (value: string, pattern?: string): boolean => {
    if (!pattern || !value) return true
    const regex = new RegExp(pattern)
    return regex.test(value)
  }

  // Get validation message for field type
  const getValidationMessage = (): string => {
    return context.i18n.validation.invalid
  }

  // Handle blur event - validate when user leaves input
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value
    const pattern = field?.pattern || props.pattern

    // Only validate if there's a value and (pattern or validation function)
    if (value && (pattern || field?.validation)) {
      let valid = true
      let customMessage = ""

      // If there's a custom validation function, use it
      if (field?.validation) {
        const result = field.validation(value)
        // Handle both boolean and object return types
        if (typeof result === "boolean") {
          valid = result
        } else {
          valid = result.valid
          customMessage = result.message || ""
        }
      } else if (pattern) {
        // Use pattern validation
        valid = validateInput(value, pattern)
      }

      setIsValid(valid)
      setValidationMessage(valid ? "" : customMessage || getValidationMessage())
    } else {
      // Reset validation state for empty values or no validation
      setIsValid(true)
      setValidationMessage("")
    }

    // Call the original onBlur if provided
    onBlur?.(e)
  }

  // Handle keydown event - hide validation error when user starts typing
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Hide validation error when user starts typing (any key except special keys)
    if (
      !isValid &&
      ![
        "Tab",
        "Escape",
        "Enter",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.key)
    ) {
      setIsValid(true)
      setValidationMessage("")
    }

    // Call the original onKeyDown if provided
    onKeyDown?.(e)
  }

  return (
    <InputGroup
      className={cn(
        "w-36",
        context.size == "sm" &&
          "h-6!",
        context.size == "default" &&
          "h-7!",
        context.size == "lg" &&
          "h-8!",
        className
      )}
    >
      {field?.prefix ? <InputGroupAddon>
          <InputGroupText>{field.prefix}</InputGroupText>
        </InputGroupAddon> : null}
      <InputGroupInput
        ref={inputRef}
        aria-invalid={!isValid}
        aria-describedby={
          !isValid && validationMessage
            ? `${field?.key || "input"}-error`
            : undefined
        }
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          context.size == "sm" &&
            "h-6! text-xs",
          context.size == "default" &&
            "h-7!",
          context.size == "lg" &&
            "h-8!"
        )}
        {...props}
      />
      {!isValid && validationMessage ? <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger render={<InputGroupButton size="icon-xs" />}>
              <AlertCircleIcon className="text-destructive size-3.5" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">{validationMessage}</p>
            </TooltipContent>
          </Tooltip>
        </InputGroupAddon> : null}

      {field?.suffix ? <InputGroupAddon align="inline-end">
          <InputGroupText>{field.suffix}</InputGroupText>
        </InputGroupAddon> : null}
    </InputGroup>
  )
}

interface FilterRemoveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode
}

function FilterRemoveButton({
  className,
  icon = (
    <CloseIcon />
  ),
  ...props
}: FilterRemoveButtonProps) {
  const context = useFilterContext()

  const sizeMap = {
    sm: "sm" as const,
    default: "sm" as const,
    lg: "default" as const,
  }

  return (
    <Button
      variant="outline"
      size={
        context.size === "sm"
          ? "icon-sm"
          : context.size === "lg"
            ? "icon-lg"
            : "icon"
      }
      {...props}
    >
      {icon}
    </Button>
  )
}

// Generic types for flexible filter system
export interface FilterOption<T = unknown> {
  className?: string
  icon?: React.ReactNode
  label: string
  metadata?: Record<string, unknown>
  value: T
}

export interface FilterOperator {
  label: string
  supportsMultiple?: boolean
  value: string
}

// Custom renderer props interface
export interface CustomRendererProps<T = unknown> {
  field: FilterFieldConfig<T>
  onChange: (values: T[]) => void
  operator: string
  values: T[]
}

// Grouped field configuration interface
export interface FilterFieldGroup<T = unknown> {
  fields: FilterFieldConfig<T>[]
  group?: string
}

// Union type for both flat and grouped field configurations
export type FilterFieldsConfig<T = unknown> =
  | FilterFieldConfig<T>[]
  | FilterFieldGroup<T>[]

export interface FilterFieldConfig<T = unknown> {
  allowCustomValues?: boolean
  className?: string
  customRenderer?: (props: CustomRendererProps<T>) => React.ReactNode
  customValueRenderer?: (
    values: T[],
    options: FilterOption<T>[]
  ) => React.ReactNode
  // Default operator to use when creating a filter for this field
  defaultOperator?: string
  fields?: FilterFieldConfig<T>[]
  // Group-level configuration
  group?: string
  // Grouping options (legacy support)
  groupLabel?: string
  icon?: React.ReactNode
  key?: string
  label?: string
  max?: number
  maxSelections?: number
  menuPopupClassName?: string
  min?: number
  offLabel?: string
  // Input event handlers
  onInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  // Boolean field options
  onLabel?: string
  onValueChange?: (values: T[]) => void
  operators?: FilterOperator[]
  // Field-specific options
  options?: FilterOption<T>[]
  pattern?: string
  placeholder?: string
  prefix?: string | React.ReactNode
  searchable?: boolean
  step?: number
  suffix?: string | React.ReactNode
  type?: "select" | "multiselect" | "text" | "custom" | "separator"
  validation?: (
    value: unknown
  ) => boolean | { message?: string; valid: boolean; }
  // Controlled values support for this field
  value?: T[]
  // Render the active-filter chip value-first ("[value] [Label]", e.g.
  // "Has · Media") with no operator segment — for boolean-style single-selects.
  // The add-filter dropdown still lists the field by `label` with its options.
  valueFirstChip?: boolean
}

// Helper functions to handle both flat and grouped field configurations
const isFieldGroup = <T = unknown,>(
  item: FilterFieldConfig<T> | FilterFieldGroup<T>
): item is FilterFieldGroup<T> => {
  return "fields" in item && Array.isArray(item.fields)
}

// Helper function to check if a FilterFieldConfig is a group-level configuration
const isGroupLevelField = <T = unknown,>(
  field: FilterFieldConfig<T>
): boolean => {
  return Boolean(field.group && field.fields)
}

const flattenFields = <T = unknown,>(
  fields: FilterFieldsConfig<T>
): FilterFieldConfig<T>[] => {
  return fields.reduce<FilterFieldConfig<T>[]>((acc, item) => {
    if (isFieldGroup(item)) {
      return [...acc, ...item.fields]
    }
    // Handle group-level fields (new structure)
    if (isGroupLevelField(item)) {
      return [...acc, ...item.fields!]
    }
    return [...acc, item]
  }, [])
}

const getFieldsMap = <T = unknown,>(
  fields: FilterFieldsConfig<T>
): Record<string, FilterFieldConfig<T>> => {
  const flatFields = flattenFields(fields)
  return flatFields.reduce(
    (acc, field) => {
      // Only add fields that have a key (skip group-level configurations)
      if (field.key) {
        acc[field.key] = field
      }
      return acc
    },
    {} as Record<string, FilterFieldConfig<T>>
  )
}

// Helper function to create operators from i18n config
const createOperatorsFromI18n = (
  i18n: FilterI18nConfig
): Record<string, FilterOperator[]> => ({
  select: [
    { value: "is", label: i18n.operators.is },
    { value: "is_not", label: i18n.operators.isNot },
    { value: "empty", label: i18n.operators.empty },
    { value: "not_empty", label: i18n.operators.notEmpty },
  ],
  multiselect: [
    { value: "is_any_of", label: i18n.operators.isAnyOf },
    { value: "is_not_any_of", label: i18n.operators.isNotAnyOf },
    { value: "includes_all", label: i18n.operators.includesAll },
    { value: "excludes_all", label: i18n.operators.excludesAll },
    { value: "empty", label: i18n.operators.empty },
    { value: "not_empty", label: i18n.operators.notEmpty },
  ],
  text: [
    { value: "contains", label: i18n.operators.contains },
    { value: "not_contains", label: i18n.operators.notContains },
    { value: "starts_with", label: i18n.operators.startsWith },
    { value: "ends_with", label: i18n.operators.endsWith },
    { value: "is", label: i18n.operators.isExactly },
    { value: "empty", label: i18n.operators.empty },
    { value: "not_empty", label: i18n.operators.notEmpty },
  ],
  custom: [
    { value: "is", label: i18n.operators.is },
    { value: "after", label: i18n.operators.after },
    { value: "is", label: i18n.operators.is },
    { value: "between", label: i18n.operators.between },
    { value: "empty", label: i18n.operators.empty },
    { value: "not_empty", label: i18n.operators.notEmpty },
  ],
})

// Default operators for different field types (using default i18n)
export const DEFAULT_OPERATORS: Record<string, FilterOperator[]> =
  createOperatorsFromI18n(DEFAULT_I18N)

// Operators that take no value(s). Switching TO one of these is the only case
// where a filter's existing `values` should be cleared; switching between any
// two value-bearing operators (e.g. is_any_of <-> is_not_any_of) preserves them.
const VALUELESS_OPERATORS = new Set(["empty", "not_empty"])

const isValuelessOperator = (operator?: string): boolean =>
  operator !== undefined && VALUELESS_OPERATORS.has(operator)

// Helper function to get operators for a field
const getOperatorsForField = <T = unknown,>(
  field: FilterFieldConfig<T>,
  values: T[],
  i18n: FilterI18nConfig
): FilterOperator[] => {
  if (field.operators) return field.operators

  const operators = createOperatorsFromI18n(i18n)

  // Determine field type for operator selection
  let fieldType = field.type || "select"

  // If it's a select field but has multiple values, treat as multiselect
  if (fieldType === "select" && values.length > 1) {
    fieldType = "multiselect"
  }

  // If it's a multiselect field or has multiselect operators, use multiselect operators
  if (fieldType === "multiselect" || field.type === "multiselect") {
    return operators.multiselect
  }

  return operators[fieldType] || operators.select
}

interface FilterOperatorDropdownProps<T = unknown> {
  field: FilterFieldConfig<T>
  onChange: (operator: string) => void
  operator: string
  values: T[]
}

function FilterOperatorDropdown<T = unknown>({
  field,
  operator,
  values,
  onChange,
}: FilterOperatorDropdownProps<T>) {
  const context = useFilterContext()
  const operators = getOperatorsForField(field, values, context.i18n)

  // Find the operator label, with fallback to formatted operator name
  const operatorLabel =
    operators.find((op) => op.value === operator)?.label ||
    context.i18n.helpers.formatOperator(operator)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size={context.size}
            className="text-muted-foreground hover:text-foreground"
          >
            {operatorLabel}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-fit min-w-fit">
        {operators.map((op) => (
          <DropdownMenuItem
            key={op.value}
            onClick={() => onChange(op.value)}
            className={cn(
              "data-highlighted:bg-accent data-highlighted:text-accent-foreground flex items-center justify-between"
            )}
          >
            <span>{op.label}</span>
            <CheckIcon className={cn(
                                "text-primary ms-auto",
                                op.value === operator ? "opacity-100" : "opacity-0"
                              )} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface FilterValueSelectorProps<T = unknown> {
  autoFocus?: boolean
  field: FilterFieldConfig<T>
  onChange: (values: T[]) => void
  operator: string
  values: T[]
}

interface SelectOptionsPopoverProps<T = unknown> {
  field: FilterFieldConfig<T>
  inline?: boolean
  onChange: (values: T[]) => void
  onClose?: () => void
  values: T[]
}

function SelectOptionsPopover<T = unknown>({
  field,
  values,
  onChange,
  onClose,
  inline = false,
}: SelectOptionsPopoverProps<T>) {
  const [open, setOpen] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const context = useFilterContext()
  const baseId = useId()

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    setHighlightedIndex(-1)
  }, [searchInput, open])

  useEffect(() => {
    if (highlightedIndex >= 0 && open) {
      const element = document.getElementById(
        `${baseId}-item-${highlightedIndex}`
      )
      element?.scrollIntoView({ block: "nearest" })
    }
  }, [highlightedIndex, open, baseId])

  const isMultiSelect = field.type === "multiselect" || values.length > 1
  const effectiveValues =
    (field.value !== undefined ? (field.value as T[]) : values) || []

  const selectedOptions =
    field.options?.filter((opt) => effectiveValues.includes(opt.value)) || []
  const unselectedOptions =
    field.options?.filter((opt) => !effectiveValues.includes(opt.value)) || []

  // Filter options based on search input
  const filteredSelectedOptions = selectedOptions // Keep all selected visible
  const filteredUnselectedOptions = unselectedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(searchInput.toLowerCase())
  )

  const allFilteredOptions = useMemo(
    () => [...filteredSelectedOptions, ...filteredUnselectedOptions],
    [filteredSelectedOptions, filteredUnselectedOptions]
  )

  const handleClose = () => {
    setOpen(false)
    onClose?.()
  }

  const renderMenuContent = () => (
    <>
      {field.searchable !== false ? <>
          <Input
            ref={inputRef}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={true}
            aria-haspopup="listbox"
            aria-controls={`${baseId}-listbox`}
            aria-activedescendant={
              highlightedIndex >= 0
                ? `${baseId}-item-${highlightedIndex}`
                : undefined
            }
            placeholder={context.i18n.placeholders.searchField(
              field.label || ""
            )}
            className={cn(
              "border-input h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none",
              "focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0",
              open && "placeholder:text-foreground"
            )}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onBlur={() => open && inputRef.current?.focus()}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault()
                if (allFilteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev < allFilteredOptions.length - 1 ? prev + 1 : 0
                  )
                }
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                if (allFilteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : allFilteredOptions.length - 1
                  )
                }
              } else if (e.key === "ArrowLeft") {
                e.preventDefault()
                setOpen(false)
              } else if (e.key === "Enter" && highlightedIndex >= 0) {
                e.preventDefault()
                const option = allFilteredOptions[highlightedIndex]
                if (option) {
                  const isSelected = effectiveValues.includes(option.value as T)
                  const next = isSelected
                    ? (effectiveValues.filter((v) => v !== option.value) as T[])
                    : isMultiSelect
                      ? ([...effectiveValues, option.value] as T[])
                      : ([option.value] as T[])

                  if (
                    !isSelected &&
                    isMultiSelect &&
                    field.maxSelections &&
                    next.length > field.maxSelections
                  ) {
                    return
                  }

                  if (field.onValueChange) {
                    field.onValueChange(next)
                  } else {
                    onChange(next)
                  }
                  if (!isMultiSelect) handleClose()
                }
              }
              e.stopPropagation()
            }}
          />
          <DropdownMenuSeparator />
        </> : null}
      <div className="relative flex max-h-full">
        <div
          className="flex max-h-[min(var(--available-height),24rem)] w-full scroll-pt-2 scroll-pb-2 flex-col overscroll-contain"
          role="listbox"
          id={`${baseId}-listbox`}
        >
          <ScrollArea className="size-full min-h-0 **:data-[slot=scroll-area-scrollbar]:m-0 [&_[data-slot=scroll-area-viewport]]:h-full [&_[data-slot=scroll-area-viewport]]:overscroll-contain">
            {allFilteredOptions.length === 0 ? <div className="text-muted-foreground py-2 text-center text-sm">
                {context.i18n.noResultsFound}
              </div> : null}

            {/* Selected items */}
            {filteredSelectedOptions.length > 0 ? <DropdownMenuGroup className="px-1">
                {filteredSelectedOptions.map((option, index) => {
                  const isHighlighted = highlightedIndex === index
                  const itemId = `${baseId}-item-${index}`

                  return (
                    <DropdownMenuCheckboxItem
                      key={String(option.value)}
                      id={itemId}
                      role="option"
                      aria-selected={isHighlighted}
                      data-highlighted={isHighlighted || undefined}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      checked={true}
                      className={cn(
                        "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                        option.className
                      )}
                      closeOnClick={!isMultiSelect}
                      onCheckedChange={() => {
                        const next = effectiveValues.filter(
                          (v) => v !== option.value
                        ) as T[]
                        if (field.onValueChange) {
                          field.onValueChange(next)
                        } else {
                          onChange(next)
                        }
                        if (!isMultiSelect) handleClose()
                      }}
                    >
                      {option.icon ? option.icon : null}
                      <span className="truncate">{option.label}</span>
                    </DropdownMenuCheckboxItem>
                  )
                })}
              </DropdownMenuGroup> : null}

            {/* Separator */}
            {filteredSelectedOptions.length > 0 &&
              filteredUnselectedOptions.length > 0 ? <DropdownMenuSeparator className="mx-0" /> : null}

            {/* Available items */}
            {filteredUnselectedOptions.length > 0 ? <DropdownMenuGroup className="px-1">
                {filteredUnselectedOptions.map((option, index) => {
                  const overallIndex = index + filteredSelectedOptions.length
                  const isHighlighted = highlightedIndex === overallIndex
                  const itemId = `${baseId}-item-${overallIndex}`

                  return (
                    <DropdownMenuCheckboxItem
                      key={String(option.value)}
                      id={itemId}
                      role="option"
                      aria-selected={isHighlighted}
                      data-highlighted={isHighlighted || undefined}
                      onMouseEnter={() => setHighlightedIndex(overallIndex)}
                      checked={false}
                      className={cn(
                        "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                        option.className
                      )}
                      closeOnClick={!isMultiSelect}
                      onCheckedChange={() => {
                        const next = isMultiSelect
                          ? ([...effectiveValues, option.value] as T[])
                          : ([option.value] as T[])

                        if (
                          isMultiSelect &&
                          field.maxSelections &&
                          next.length > field.maxSelections
                        ) {
                          return
                        }

                        if (field.onValueChange) {
                          field.onValueChange(next)
                        } else {
                          onChange(next)
                        }
                        if (!isMultiSelect) handleClose()
                      }}
                    >
                      {option.icon ? option.icon : null}
                      <span className="truncate">{option.label}</span>
                    </DropdownMenuCheckboxItem>
                  )
                })}
              </DropdownMenuGroup> : null}
          </ScrollArea>
        </div>
      </div>
    </>
  )

  if (inline) {
    return <div className="w-full">{renderMenuContent()}</div>
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(open) => {
        setOpen(open)
        if (!open) {
          setTimeout(() => setSearchInput(""), 200)
        }
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size={context.size}>
            <div className="flex items-center gap-1.5">
              {field.customValueRenderer ? (
                field.customValueRenderer(values, field.options || [])
              ) : (
                <>
                  {selectedOptions.length > 0 ? <div className="flex items-center gap-1">
                      {selectedOptions.slice(0, 3).map((option) => (
                        <div key={String(option.value)}>{option.icon}</div>
                      ))}
                    </div> : null}
                  {selectedOptions.length === 1
                    ? selectedOptions[0].label
                    : selectedOptions.length > 1
                      ? `${selectedOptions.length} ${context.i18n.selectedCount}`
                      : context.i18n.select}
                </>
              )}
            </div>
          </Button>
        }
      />
      <DropdownMenuContent
        align="start"
        className={cn("w-[200px] px-0", field.className)}
      >
        {renderMenuContent()}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FilterValueSelector<T = unknown>({
  field,
  values,
  onChange,
  operator,
  autoFocus,
}: FilterValueSelectorProps<T>) {
  const context = useFilterContext()

  if (operator === "empty" || operator === "not_empty") {
    return null
  }

  if (field.customRenderer) {
    return (
      <ButtonGroupText className="hover:bg-accent aria-expanded:bg-accent bg-background dark:bg-input/30 text-start whitespace-nowrap outline-hidden">
        {field.customRenderer({ field, values, onChange, operator })}
      </ButtonGroupText>
    )
  }

  if (field.type === "text") {
    return (
      <FilterInput
        type="text"
        value={(values[0] as string) || ""}
        onChange={(e) => onChange([e.target.value] as T[])}
        placeholder={field.placeholder}
        pattern={field.pattern}
        field={field}
        className={cn("w-36", field.className)}
        autoFocus={autoFocus}
      />
    )
  }

  if (field.type === "select" || field.type === "multiselect") {
    return (
      <SelectOptionsPopover field={field} values={values} onChange={onChange} />
    )
  }

  return (
    <SelectOptionsPopover field={field} values={values} onChange={onChange} />
  )
}
export interface Filter<T = unknown> {
  field: string
  id: string
  operator: string
  values: T[]
}

export interface FilterGroup<T = unknown> {
  fields: FilterFieldConfig<T>[]
  filters: Filter<T>[]
  id: string
  label?: string
}

interface FiltersContentProps<T = unknown> {
  fields: FilterFieldsConfig<T>
  filters: Filter<T>[]
  onChange: (filters: Filter<T>[]) => void
}

export const FiltersContent = <T = unknown,>({
  filters,
  fields,
  onChange,
}: FiltersContentProps<T>) => {
  const context = useFilterContext()
  const fieldsMap = useMemo(() => getFieldsMap(fields), [fields])

  const updateFilter = useCallback(
    (filterId: string, updates: Partial<Filter<T>>) => {
      onChange(
        filters.map((filter) => {
          if (filter.id === filterId) {
            const updatedFilter = { ...filter, ...updates }
            // Only wipe values when switching TO a no-value operator. Switching
            // between value-bearing operators of the same shape keeps `values`.
            if (
              updates.operator !== undefined &&
              isValuelessOperator(updates.operator)
            ) {
              updatedFilter.values = [] as T[]
            }
            return updatedFilter
          }
          return filter
        })
      )
    },
    [filters, onChange]
  )

  const removeFilter = useCallback(
    (filterId: string) => {
      onChange(filters.filter((filter) => filter.id !== filterId))
    },
    [filters, onChange]
  )

  return (
    <div
      className={cn(
        filtersContainerVariants({
          variant: context.variant,
          size: context.size,
        }),
        context.className
      )}
    >
      {filters.map((filter) => {
        const field = fieldsMap[filter.field]
        if (!field) return null

        // Boolean-style chips (`valueFirstChip`): a single value pill (the
        // selected option's icon + label, e.g. "Has media") with no field-label
        // or operator segment. The value popover lets you switch to the other
        // option. The field still appears by `label` (with its options) in the
        // add-filter dropdown.
        if (field.valueFirstChip) {
          return (
            <ButtonGroup key={filter.id}>
              <FilterValueSelector<T>
                field={field}
                values={filter.values}
                onChange={(values) => updateFilter(filter.id, { values })}
                operator={filter.operator}
                autoFocus={false}
              />
              <FilterRemoveButton onClick={() => removeFilter(filter.id)} />
            </ButtonGroup>
          )
        }

        return (
          <ButtonGroup key={filter.id}>
            <ButtonGroupText>
              {field.icon ? field.icon : null}
              {field.label}
            </ButtonGroupText>

            <FilterOperatorDropdown<T>
              field={field}
              operator={filter.operator}
              values={filter.values}
              onChange={(operator) => updateFilter(filter.id, { operator })}
            />

            <FilterValueSelector<T>
              field={field}
              values={filter.values}
              onChange={(values) => updateFilter(filter.id, { values })}
              operator={filter.operator}
              autoFocus={false}
            />

            <FilterRemoveButton onClick={() => removeFilter(filter.id)} />
          </ButtonGroup>
        )
      })}
    </div>
  )
}

interface FiltersProps<T = unknown> {
  allowMultiple?: boolean
  className?: string
  collapseAddButton?: boolean
  enableShortcut?: boolean
  fields: FilterFieldsConfig<T>
  filters: Filter<T>[]
  i18n?: Partial<FilterI18nConfig>
  menuPopupClassName?: string
  onChange: (filters: Filter<T>[]) => void
  /**
   * Which parts to render. `"all"` (default) renders the add-filter trigger and
   * the active chips together. `"trigger"` renders only the add-filter control
   * and `"chips"` only the active chips — let a consumer place them in separate
   * layout slots (e.g. trigger next to a search box, chips on their own row)
   * by rendering two controlled instances that share the same `filters`/`onChange`.
   */
  parts?: "all" | "trigger" | "chips"
  radius?: "default" | "full"
  shortcutKey?: string
  shortcutLabel?: string
  showSearchInput?: boolean
  size?: "sm" | "default" | "lg"
  trigger?: React.ReactNode
  variant?: "solid" | "default"
}

interface FilterSubmenuContentProps<T = unknown> {
  currentValues: T[]
  field: FilterFieldConfig<T>
  i18n: FilterI18nConfig
  isActive?: boolean
  isMultiSelect: boolean
  onActive?: () => void
  onBack?: () => void
  onClose?: () => void
  onToggle: (value: T, isSelected: boolean) => void
}

function FilterSubmenuContent<T = unknown>({
  field,
  currentValues,
  isMultiSelect,
  onToggle,
  i18n,
  isActive,
  onActive,
  onBack,
  onClose,
}: FilterSubmenuContentProps<T>) {
  const [searchInput, setSearchInput] = useState("")
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const baseId = useId()

  useEffect(() => {
    if (isActive) {
      if (field.searchable !== false) {
        inputRef.current?.focus()
      } else {
        const listbox = document.getElementById(`${baseId}-listbox`)
        listbox?.focus()
      }
    }
  }, [isActive, field.searchable, baseId])

  useEffect(() => {
    setHighlightedIndex(-1)
  }, [searchInput])

  useEffect(() => {
    if (highlightedIndex >= 0 && isActive) {
      const element = document.getElementById(
        `${baseId}-item-${highlightedIndex}`
      )
      element?.scrollIntoView({ block: "nearest" })
    }
  }, [highlightedIndex, isActive, baseId])

  const filteredOptions = useMemo(() => {
    return (
      field.options?.filter((option) => {
        const isSelected = currentValues.includes(option.value)
        if (isSelected) return true
        if (!searchInput) return true
        return option.label.toLowerCase().includes(searchInput.toLowerCase())
      }) || []
    )
  }, [field.options, searchInput, currentValues])

  useEffect(() => {
    if (isActive && filteredOptions.length > 0) {
      setHighlightedIndex(0)
    }
  }, [isActive, filteredOptions.length])

  return (
    <div className="flex flex-col" onMouseEnter={onActive}>
      {field.searchable !== false ? <>
          <Input
            ref={inputRef}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={true}
            aria-haspopup="listbox"
            aria-controls={`${baseId}-listbox`}
            aria-activedescendant={
              highlightedIndex >= 0
                ? `${baseId}-item-${highlightedIndex}`
                : undefined
            }
            placeholder={i18n.placeholders.searchField(field.label || "")}
            className={cn(
              "h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none",
              "focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0",
              isActive && "placeholder:text-foreground"
            )}
            value={searchInput}
            onBlur={() => isActive && inputRef.current?.focus()}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => onActive?.()}
            onMouseEnter={(e) => {
              onActive?.()
              e.stopPropagation()
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault()
                if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                  )
                }
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                  )
                }
              } else if (e.key === "ArrowLeft") {
                e.preventDefault()
                onBack?.()
              } else if (e.key === "Enter" && highlightedIndex >= 0) {
                e.preventDefault()
                const option = filteredOptions[highlightedIndex]
                if (option) {
                  onToggle(
                    option.value as T,
                    currentValues.includes(option.value)
                  )
                  if (!isMultiSelect) {
                    onBack?.()
                  }
                }
              } else if (e.key === "Escape") {
                e.preventDefault()
                onClose?.()
              }
              e.stopPropagation()
            }}
          />
          <DropdownMenuSeparator />
        </> : null}
      <div className="relative flex max-h-full">
        <div
          className="flex max-h-[min(var(--available-height),24rem)] w-full scroll-pt-2 scroll-pb-2 flex-col overscroll-contain outline-hidden"
          role="listbox"
          id={`${baseId}-listbox`}
          tabIndex={field.searchable === false ? 0 : -1}
          onKeyDown={(e) => {
            if (field.searchable === false) {
              if (e.key === "ArrowDown") {
                e.preventDefault()
                if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                  )
                }
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                  )
                }
              } else if (e.key === "ArrowLeft") {
                e.preventDefault()
                onBack?.()
              } else if (e.key === "Enter" && highlightedIndex >= 0) {
                e.preventDefault()
                const option = filteredOptions[highlightedIndex]
                if (option) {
                  onToggle(
                    option.value as T,
                    currentValues.includes(option.value)
                  )
                  if (!isMultiSelect) {
                    onBack?.()
                  }
                }
              } else if (e.key === "Escape") {
                e.preventDefault()
                onClose?.()
              }
              e.stopPropagation()
            }
          }}
        >
          <ScrollArea className="size-full min-h-0 **:data-[slot=scroll-area-scrollbar]:m-0 [&_[data-slot=scroll-area-viewport]]:h-full [&_[data-slot=scroll-area-viewport]]:overscroll-contain">
            {filteredOptions.length === 0 ? (
              <div className="text-muted-foreground py-2 text-center text-sm">
                {i18n.noResultsFound}
              </div>
            ) : (
              <DropdownMenuGroup>
                {filteredOptions.map((option, index) => {
                  const isSelected = currentValues.includes(option.value)
                  const isHighlighted = highlightedIndex === index
                  const itemId = `${baseId}-item-${index}`

                  return (
                    <DropdownMenuCheckboxItem
                      key={String(option.value)}
                      id={itemId}
                      role="option"
                      aria-selected={isHighlighted}
                      data-highlighted={isHighlighted || undefined}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      checked={isSelected}
                      className={cn(
                        "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                        option.className
                      )}
                      closeOnClick={!isMultiSelect}
                      onCheckedChange={() =>
                        onToggle(option.value as T, isSelected)
                      }
                    >
                      {option.icon ? option.icon : null}
                      <span className="truncate">{option.label}</span>
                    </DropdownMenuCheckboxItem>
                  )
                })}
              </DropdownMenuGroup>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}

export function Filters<T = unknown>({
  filters,
  fields,
  onChange,
  className,
  variant = "default",
  size = "default",
  radius = "default",
  i18n,
  showSearchInput = true,
  trigger,
  allowMultiple = true,
  parts = "all",
  menuPopupClassName,
  enableShortcut = false,
  shortcutKey = "f",
  shortcutLabel = "F",
}: FiltersProps<T>) {
  const [addFilterOpen, setAddFilterOpen] = useState(false)
  const [menuSearchInput, setMenuSearchInput] = useState("")
  const [activeMenu, setActiveMenu] = useState<string>("root")
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [lastAddedFilterId, setLastAddedFilterId] = useState<string | null>(
    null
  )
  const rootInputRef = useRef<HTMLInputElement>(null)
  const rootId = useId()

  useEffect(() => {
    if (!enableShortcut) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === shortcutKey.toLowerCase() &&
        !addFilterOpen &&
        !(
          document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement
        )
      ) {
        e.preventDefault()
        setAddFilterOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [enableShortcut, shortcutKey, addFilterOpen])

  useEffect(() => {
    if (addFilterOpen && activeMenu === "root") {
      rootInputRef.current?.focus()
    }
  }, [addFilterOpen, activeMenu])

  useEffect(() => {
    setHighlightedIndex(-1)
  }, [menuSearchInput])

  useEffect(() => {
    if (highlightedIndex >= 0 && addFilterOpen) {
      const element = document.getElementById(
        `${rootId}-item-${highlightedIndex}`
      )
      element?.scrollIntoView({ block: "nearest" })
    }
  }, [highlightedIndex, addFilterOpen, rootId])

  useEffect(() => {
    if (!addFilterOpen) {
      setOpenSubMenu(null)
    }
  }, [addFilterOpen])

  useEffect(() => {
    if (lastAddedFilterId) {
      const timer = setTimeout(() => {
        setLastAddedFilterId(null)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [lastAddedFilterId])

  const mergedI18n: FilterI18nConfig = {
    ...DEFAULT_I18N,
    ...i18n,
    operators: { ...DEFAULT_I18N.operators, ...i18n?.operators },
    placeholders: { ...DEFAULT_I18N.placeholders, ...i18n?.placeholders },
    validation: { ...DEFAULT_I18N.validation, ...i18n?.validation },
  }

  const fieldsMap = useMemo(() => getFieldsMap(fields), [fields])

  const updateFilter = useCallback(
    (filterId: string, updates: Partial<Filter<T>>) => {
      onChange(
        filters.map((filter) => {
          if (filter.id === filterId) {
            const updatedFilter = { ...filter, ...updates }
            // Only wipe values when switching TO a no-value operator. Switching
            // between value-bearing operators of the same shape keeps `values`.
            if (
              updates.operator !== undefined &&
              isValuelessOperator(updates.operator)
            ) {
              updatedFilter.values = [] as T[]
            }
            return updatedFilter
          }
          return filter
        })
      )
    },
    [filters, onChange]
  )

  const removeFilter = useCallback(
    (filterId: string) => {
      onChange(filters.filter((filter) => filter.id !== filterId))
    },
    [filters, onChange]
  )

  const addFilter = useCallback(
    (fieldKey: string) => {
      const field = fieldsMap[fieldKey]
      if (field && field.key) {
        const defaultOperator =
          field.defaultOperator ||
          (field.type === "multiselect" ? "is_any_of" : "is")
        const defaultValues: unknown[] = field.type === "text" ? [""] : []
        const newFilter = createFilter<T>(
          fieldKey,
          defaultOperator,
          defaultValues as T[]
        )
        setLastAddedFilterId(newFilter.id)
        onChange([...filters, newFilter])
        setAddFilterOpen(false)
        setMenuSearchInput("")
      }
    },
    [fieldsMap, filters, onChange]
  )

  useEffect(() => {
    if (addFilterOpen && activeMenu === "root") {
      rootInputRef.current?.focus()
    }
  }, [addFilterOpen, activeMenu])

  const selectableFields = useMemo(() => {
    const flatFields = flattenFields(fields)
    return flatFields.filter((field) => {
      if (!field.key || field.type === "separator") return false
      if (allowMultiple) return true
      return !filters.some((filter) => filter.field === field.key)
    })
  }, [fields, filters, allowMultiple])

  const filteredFields = useMemo(() => {
    return selectableFields.filter(
      (f) =>
        !menuSearchInput ||
        f.label?.toLowerCase().includes(menuSearchInput.toLowerCase())
    )
  }, [selectableFields, menuSearchInput])

  useEffect(() => {
    if (addFilterOpen && filteredFields.length > 0) {
      setHighlightedIndex(0)
    }
  }, [addFilterOpen, filteredFields.length])

  const triggerButton = useRender({
    render: trigger as React.ReactElement,
    defaultTagName: "button",
  })

  return (
    <FilterContext.Provider
      value={{
        variant,
        size,
        radius,
        i18n: mergedI18n,
        className,
        trigger,
        allowMultiple,
      }}
    >
      <div
        className={cn(filtersContainerVariants({ variant, size }), className)}
      >
        {parts !== "chips" && selectableFields.length > 0 ? <DropdownMenu
            open={addFilterOpen}
            onOpenChange={(open) => {
              setAddFilterOpen(open)
              if (!open) {
                setMenuSearchInput("")
              } else {
                setActiveMenu("root")
              }
            }}
          >
            <DropdownMenuTrigger render={triggerButton} />
            <DropdownMenuContent
              className={cn("w-[220px]", menuPopupClassName)}
              align="start"
            >
              {showSearchInput ? <>
                  <div className="relative">
                    <Input
                      ref={rootInputRef}
                      role="combobox"
                      aria-controls={`${rootId}-listbox`}
                      aria-activedescendant={
                        highlightedIndex >= 0
                          ? `${rootId}-item-${highlightedIndex}`
                          : undefined
                      }
                      placeholder={mergedI18n.searchFields}
                      className={cn(
                        "h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none",
                        "focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0",
                        activeMenu === "root" && "placeholder:text-foreground"
                      )}
                      value={menuSearchInput}
                      onFocus={() => setActiveMenu("root")}
                      onMouseEnter={() => setActiveMenu("root")}
                      onBlur={() =>
                        activeMenu === "root" && rootInputRef.current?.focus()
                      }
                      onChange={(e) => setMenuSearchInput(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault()
                          if (filteredFields.length > 0) {
                            setHighlightedIndex((prev) =>
                              prev < filteredFields.length - 1 ? prev + 1 : 0
                            )
                          }
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault()
                          if (filteredFields.length > 0) {
                            setHighlightedIndex((prev) =>
                              prev > 0 ? prev - 1 : filteredFields.length - 1
                            )
                          }
                        } else if (
                          (e.key === "ArrowRight" || e.key === "ArrowLeft") &&
                          highlightedIndex >= 0
                        ) {
                          const field = filteredFields[highlightedIndex]
                          const hasSubMenu =
                            field &&
                            (field.type === "select" ||
                              field.type === "multiselect") &&
                            field.options?.length

                          if (e.key === "ArrowRight" && hasSubMenu) {
                            e.preventDefault()
                            setOpenSubMenu(field.key || null)
                            setActiveMenu(field.key || "root")
                          } else if (e.key === "ArrowLeft") {
                            e.preventDefault()
                            if (openSubMenu) {
                              setOpenSubMenu(null)
                              setActiveMenu("root")
                            }
                          }
                        } else if (e.key === "Enter" && highlightedIndex >= 0) {
                          e.preventDefault()
                          const field = filteredFields[highlightedIndex]
                          if (field.key) {
                            const hasSubMenu =
                              (field.type === "select" ||
                                field.type === "multiselect") &&
                              field.options?.length
                            if (!hasSubMenu) {
                              addFilter(field.key)
                            } else {
                              if (openSubMenu === field.key) {
                                setOpenSubMenu(null)
                                setActiveMenu("root")
                              } else {
                                setOpenSubMenu(field.key)
                                setActiveMenu(field.key)
                              }
                            }
                          }
                        } else if (e.key === "Escape") {
                          setAddFilterOpen(false)
                        }
                        e.stopPropagation()
                      }}
                    />
                    {enableShortcut && shortcutLabel ? <Kbd className="bg-background absolute top-1/2 end-2 -translate-y-1/2 border">
                        {shortcutLabel}
                      </Kbd> : null}
                  </div>
                  <DropdownMenuSeparator />
                </> : null}

              <div className="relative flex max-h-full">
                <div
                  className="flex max-h-[min(var(--available-height),24rem)] w-full scroll-pt-2 scroll-pb-2 flex-col overscroll-contain"
                  role="listbox"
                  id={`${rootId}-listbox`}
                  onMouseEnter={() => setActiveMenu("root")}
                >
                  <ScrollArea className="**:data-[slot=scroll-area-scrollbar]:m-0">
                    {(() => {
                      if (filteredFields.length === 0) {
                        return (
                          <div className="text-muted-foreground py-2 text-center text-sm">
                            {mergedI18n.noFieldsFound}
                          </div>
                        )
                      }

                      return filteredFields.map((field, index) => {
                        const isHighlighted = highlightedIndex === index
                        const itemId = `${rootId}-item-${index}`
                        const hasSubMenu =
                          (field.type === "select" ||
                            field.type === "multiselect") &&
                          field.options?.length

                        if (hasSubMenu) {
                          const isMultiSelect = field.type === "multiselect"
                          const fieldKey = field.key as string
                          // Track the in-progress filter by FIELD KEY rather than
                          // a generated id: consumers commonly re-key filters on
                          // every onChange, which would otherwise orphan the id and
                          // make each selection replace (not accumulate) the last.
                          const sessionFilter =
                            filters.find((f) => f.field === fieldKey) ?? null
                          const currentValues = sessionFilter?.values || []

                          return (
                            <DropdownMenuSub
                              key={fieldKey}
                              open={openSubMenu === fieldKey}
                              onOpenChange={(open) => {
                                if (open) {
                                  setOpenSubMenu(fieldKey)
                                } else {
                                  if (openSubMenu === fieldKey) {
                                    setOpenSubMenu(null)
                                    setActiveMenu("root")
                                  }
                                }
                              }}
                            >
                              <DropdownMenuSubTrigger
                                id={itemId}
                                role="option"
                                aria-selected={isHighlighted}
                                data-highlighted={isHighlighted || undefined}
                                onMouseEnter={() => {
                                  setHighlightedIndex(index)
                                  setActiveMenu("root")
                                }}
                                className="data-popup-open:bg-accent data-popup-open:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                              >
                                {field.icon}
                                <span>{field.label}</span>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent
                                className="w-[200px]"
                                side="inline-end"
                              >
                                <FilterSubmenuContent
                                  field={field}
                                  currentValues={currentValues}
                                  isMultiSelect={isMultiSelect}
                                  i18n={mergedI18n}
                                  isActive={activeMenu === fieldKey}
                                  onActive={() => {
                                    if (field.searchable !== false) {
                                      setActiveMenu(fieldKey)
                                    }
                                  }}
                                  onBack={() => {
                                    setOpenSubMenu(null)
                                    setActiveMenu("root")
                                  }}
                                  onClose={() => setAddFilterOpen(false)}
                                  onToggle={(value, isSelected) => {
                                    if (isMultiSelect) {
                                      const nextValues = isSelected
                                        ? (currentValues.filter(
                                            (v) => v !== value
                                          ) as T[])
                                        : ([...currentValues, value] as T[])

                                      if (sessionFilter) {
                                        if (nextValues.length === 0) {
                                          onChange(
                                            filters.filter(
                                              (f) => f.id !== sessionFilter.id
                                            )
                                          )
                                        } else {
                                          onChange(
                                            filters.map((f) =>
                                              f.id === sessionFilter.id
                                                ? { ...f, values: nextValues }
                                                : f
                                            )
                                          )
                                        }
                                      } else {
                                        const newFilter = createFilter<T>(
                                          fieldKey,
                                          field.defaultOperator || "is_any_of",
                                          nextValues
                                        )
                                        onChange([...filters, newFilter])
                                      }
                                    } else {
                                      const newFilter = createFilter<T>(
                                        fieldKey,
                                        field.defaultOperator || "is",
                                        [value] as T[]
                                      )
                                      setLastAddedFilterId(newFilter.id)
                                      onChange([...filters, newFilter])
                                      setAddFilterOpen(false)
                                    }
                                  }}
                                />
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          )
                        }

                        return (
                          <DropdownMenuItem
                            key={field.key}
                            id={itemId}
                            role="option"
                            aria-selected={isHighlighted}
                            data-highlighted={isHighlighted || undefined}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            onClick={() => field.key && addFilter(field.key)}
                            className="data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                          >
                            {field.icon}
                            <span>{field.label}</span>
                          </DropdownMenuItem>
                        )
                      })
                    })()}
                  </ScrollArea>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu> : null}

        {parts !== "trigger" ? filters.map((filter) => {
          const field = fieldsMap[filter.field]
          if (!field) return null
          // Boolean-style chips (`valueFirstChip`): a single value pill (the
          // selected option's icon + label, e.g. "Has media") that opens the
          // value popover to switch — no field-label or operator segment.
          if (field.valueFirstChip) {
            return (
              <ButtonGroup key={filter.id}>
                <FilterValueSelector<T>
                  field={field}
                  values={filter.values}
                  operator={filter.operator}
                  onChange={(values) => updateFilter(filter.id, { values })}
                  autoFocus={filter.id === lastAddedFilterId}
                />
                <FilterRemoveButton onClick={() => removeFilter(filter.id)} />
              </ButtonGroup>
            )
          }
          return (
            <ButtonGroup key={filter.id}>
              <ButtonGroupText className="bg-background dark:bg-input/30">
                {field.icon ? field.icon : null}
                {field.label}
              </ButtonGroupText>
              <FilterOperatorDropdown<T>
                field={field}
                operator={filter.operator}
                values={filter.values}
                onChange={(operator) => updateFilter(filter.id, { operator })}
              />
              <FilterValueSelector<T>
                field={field}
                values={filter.values}
                operator={filter.operator}
                onChange={(values) => updateFilter(filter.id, { values })}
                autoFocus={filter.id === lastAddedFilterId}
              />
              <FilterRemoveButton onClick={() => removeFilter(filter.id)} />
            </ButtonGroup>
          )
        }) : null}
      </div>
    </FilterContext.Provider>
  )
}

export const createFilter = <T = unknown,>(
  field: string,
  operator?: string,
  values: T[] = []
): Filter<T> => ({
  id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  field,
  operator: operator || "is",
  values,
})

export const createFilterGroup = <T = unknown,>(
  id: string,
  label: string,
  fields: FilterFieldConfig<T>[],
  initialFilters: Filter<T>[] = []
): FilterGroup<T> => ({
  id,
  label,
  filters: initialFilters,
  fields,
})
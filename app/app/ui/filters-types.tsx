import type * as React from "react"

/* -------------------------------------------------------------------------- */
/*                                 Query tree                                 */
/* -------------------------------------------------------------------------- */

export type FilterCombinator = "and" | "or"

/**
 * One condition. `path` maps one to one onto the cascader's `details.path`, so
 * a field selection commits untranslated. `value` is SINGULAR and the
 * operator's `arity` decides its shape: `"many"` holds an array, `"range"` a
 * tuple, `"none"` undefined.
 */
export interface FilterRule<V = unknown> {
  id: string
  /** Flips the meaning in place. Set by Negate when there is no `inverse`. */
  negated?: boolean
  operator: string
  /** Field path, root first. `["name", "first"]` for a nested attribute. */
  path: string[]
  type: "rule"
  value: V | undefined
}

/** Rules under one combinator; nests, so nesting is never a later break. */
export interface FilterGroupNode<V = unknown> {
  combinator: FilterCombinator
  id: string
  rules: FilterNode<V>[]
  type: "group"
}

export type FilterNode<V = unknown> = FilterRule<V> | FilterGroupNode<V>

/** A whole query. Always a group, so flat and nested are one code path. */
export type FilterQuery<V = unknown> = FilterGroupNode<V>

export type FilterChangeReason =
  | "add"
  | "update"
  | "remove"
  | "duplicate"
  | "negate"
  | "reorder"
  | "combinator"
  | "clear"

/** Second argument to `onQueryChange`, so nobody has to diff two trees. */
export interface FilterChangeDetails<V = unknown, O = unknown> {
  /** The field the rule points at, resolved. Null when the path is unknown. */
  field: FilterField<V, O> | null
  reason: FilterChangeReason
  /** The rule that changed, or null for whole-query changes like `clear`. */
  rule: FilterRule<V> | null
}

/* -------------------------------------------------------------------------- */
/*                                  Operators                                 */
/* -------------------------------------------------------------------------- */

/**
 * How many values an operator takes. Answers "does this need a value editor"
 * for every operator, a consumer's own included, in place of the hardcoded
 * `operator === "empty"` checks it replaced.
 */
export type FilterOperatorArity = "none" | "one" | "many" | "range"

export interface FilterOperator {
  /** Defaults to `"one"`. */
  arity?: FilterOperatorArity
  /** Hidden from the operator list but still valid in a restored query. */
  hidden?: boolean
  /** The opposite operator. Negate flips to it, else sets `rule.negated`. */
  inverse?: string
  label: string
  value: string
}

/* -------------------------------------------------------------------------- */
/*                                   Fields                                   */
/* -------------------------------------------------------------------------- */

/**
 * Which built-in editor a field uses by DEFAULT: `editor` overrides it, and an
 * operator may override both. No date type on purpose - every product wants a
 * different date control, and a built-in one would add a calendar dependency to
 * every install, so a date ships as an `editor`.
 */
export type FilterValueType =
  | "text"
  | "number"
  | "range"
  | "select"
  | "multiselect"
  | "boolean"

export interface FilterOption<O = unknown> {
  /** Arbitrary payload, carried untouched through every render callback. */
  data?: O
  description?: string
  disabled?: boolean
  /**
   * The row that means NONE OF THE ABOVE: Unassigned, No label, No due date.
   * Picking it clears every other pick and picking anything else clears it, and
   * it is drawn apart under a rule of its own, because a list that wipes a
   * selection must not look like one that does not; hide that line with
   * `"[&_[data-slot=filter-menu-divider]]:hidden"`. Applied under EVERY
   * operator, negative ones included. The value must be RESOLVABLE, since the
   * rule runs through the option service: an option that exists only in an
   * unfetched `loadOptions` page is invisible to it.
   */
  exclusive?: boolean
  icon?: React.ReactNode
  keywords?: string[]
  label: string
  value: string
}

export interface FilterLoadContext {
  cursor?: string
  /** Aborted when the query changes, the editor closes, or a load supersedes. */
  signal: AbortSignal
}

/** Result of `loadOptions`, or a bare array. Shape-locked to the cascader. */
export interface FilterLoadResult<O = unknown> {
  /** Defaults to whether `nextCursor` was supplied. */
  hasMore?: boolean
  items: FilterOption<O>[]
  nextCursor?: string
}

/** A field, or a branch. A group is a field with `fields`, not `selectable`. */
export interface FilterField<V = unknown, O = unknown> {
  /**
   * Reaches the value editor's PANEL. Merged last through tailwind-merge, so a
   * `w-*` here beats the default rather than losing to it on source order.
   *
   * HEIGHT IS A VARIABLE, NOT A UTILITY: a `max-h-*` here bounds the PANEL and
   * does nothing to the list inside it, which owns its own `max-height`. Write
   * `--cascader-max-height: 28rem` as an arbitrary property instead; the cap is
   * the SMALLER of that and the space the popup has.
   */
  className?: string
  /** The storage column when it differs from the UI path. Never read here. */
  column?: string
  /** Trailing count. Defaults to known children; set it when they are lazy. */
  count?: number
  data?: unknown
  defaultOperator?: string
  description?: string
  disabled?: boolean
  /** Overrides the editor chosen from `type`. See `FilterEditorProps`. */
  editor?: FilterEditorRef<V, O>
  fields?: FilterField<V, O>[]

  icon?: React.ReactNode
  /** Stable id. Unique among its siblings; the full path must be unique. */
  id: string
  keywords?: string[]
  label: string

  /** Async options, paged via `cursor`. Any `options` also seed the cache. */
  loadOptions?: (
    query: string,
    context: FilterLoadContext
  ) => FilterOption<O>[] | Promise<FilterOption<O>[] | FilterLoadResult<O>>
  /** Operators for this field. Falls back to the catalog for its `type`. */
  operators?:
    | FilterOperator[]
    | ((field: FilterField<V, O>) => FilterOperator[])

  options?: FilterOption<O>[]
  /**
   * Whether an option-backed editor STACKS the picks at the top of its list.
   * Off by default, because a short closed list is read as a whole and lifting
   * a row out of a memorised order costs more than it buys. The partition is
   * taken LIVE unless `sortSelected: "snapshot"`, so ticking a row moves the
   * rows below it and the highlight is carried across by VALUE. Exclusive
   * options never join the stack; they are grouped by ROLE.
   */
  pinSelected?: boolean
  /** Placeholder for the value editor's input, or an option list's search. */
  placeholder?: string

  renderValue?: (context: FilterValueDisplayContext<V, O>) => React.ReactNode
  /** Resolves stored values the loader never returned, for restored chips. */
  resolveValues?: (
    values: string[]
  ) => FilterOption<O>[] | Promise<FilterOption<O>[]>
  /** SHOWS the search box (default true). Off keeps it, hidden: it owns focus. */
  searchable?: boolean
  /** Whether a BRANCH is itself filterable. Leaves always are. */
  selectable?: boolean
  /**
   * How an option list is ordered INSIDE each group, plus WHEN the partition is
   * taken under `pinSelected`. With pinning off there is no partition, so
   * `"snapshot"` is the same thing as `"none"`.
   *
   * - `"none"` (default) keeps declaration order. Not alphabetical, because
   *   option order is usually semantic (To do, In progress, Done).
   * - `"label"` sorts with `localeCompare`, so "Ålesund" files next to
   *   "Alesund" rather than after "Zurich".
   * - `"snapshot"` keeps declaration order too, and freezes the partition as
   *   the menu opened it: a steady pointer target where the other two re-pin
   *   live.
   */
  sortSelected?: "none" | "label" | "snapshot"
  type?: FilterValueType

  /**
   * This field's own validity check. Return a MESSAGE to mark the value cell
   * invalid, or `null` / `undefined` / `false` when the value is fine. A string
   * rather than a schema object keeps the primitive library-agnostic.
   *
   * ORDER MATTERS: the built-in checks run first and this runs only when they
   * pass, so a validator never re-answers "is there a value at all". Not called
   * for a valueless operator, nor for a rule whose field the schema no longer
   * has, and shown only once the user has committed a value to that rule.
   */
  validate?: (
    context: FilterValidateContext<V, O>
  ) => string | null | undefined | false
  /** The value as PLAIN TEXT for a11y; the default is `String(value)`. */
  valueText?: (context: FilterValueDisplayContext<V, O>) => string
}

/* -------------------------------------------------------------------------- */
/*                                   Editors                                  */
/* -------------------------------------------------------------------------- */

/**
 * Where an editor renders. The SAME component serves both: `"create"` is the
 * wizard step, which has Back and advances on commit, `"amend"` the
 * chip-anchored popover, which offers Discard instead.
 */
export type FilterEditorHost = "create" | "amend"

export interface FilterOptionsState<O = unknown> {
  error: boolean
  hasMore: boolean
  items: FilterOption<O>[]
  loading: boolean
  loadMore: () => void
  /** Current search text. Debounced before it reaches `loadOptions`. */
  query: string
  /** Resolves a stored value to its option, from cache when possible. */
  resolve: (value: string) => FilterOption<O> | undefined
  retry: () => void
  setQuery: (query: string) => void
}

export interface FilterCommitOptions {
  /** Dismiss the host after writing. Defaults to true. */
  close?: boolean
}

export interface FilterEditorProps<V = unknown, O = unknown> {
  /**
   * Spread onto whichever element should take focus, so no editor reaches for
   * `setTimeout`. A CALLBACK ref at `HTMLElement` is the one shape assignable
   * to every element's own ref prop, so it spreads onto an input, a slider or a
   * button without a cast.
   */
  autoFocusProps: {
    autoFocus: boolean
    ref: React.RefCallback<HTMLElement>
  }
  /** Step back. Only meaningful when `host === "create"`. */
  back: () => void
  cancel: () => void
  /** Accept the draft. `{ close: false }` writes through without dismissing. */
  commit: (value?: V, options?: FilterCommitOptions) => void
  field: FilterField<V, O>
  host: FilterEditorHost
  labels: FilterLabels
  onValueChange: (value: V | undefined) => void
  operator: FilterOperator
  options: FilterOptionsState<O>
  /** The DRAFT value. An editor edits a draft; the host commits it. */
  value: V | undefined
}

export type FilterEditor<V = unknown, O = unknown> = React.ComponentType<
  FilterEditorProps<V, O>
>

/**
 * An editor with its generics erased, for the registry. `unknown` rather than
 * `never`: props are contravariant, so a `FilterEditor<never, never>` registry
 * accepts nothing at all. The single widening cast happens where it renders.
 */
export type AnyFilterEditor = React.ComponentType<
  FilterEditorProps<unknown, unknown>
>

export type FilterEditorRegistry = Record<string, AnyFilterEditor>

/**
 * A registered editor's name, or a component. The `any` arm lets a CONCRETE
 * editor sit on an unknown-typed field without a cast: props are contravariant,
 * so `FilterEditor<DateValue>` is not a `FilterEditor<unknown>`. The widening
 * happens once, inside `resolveFilterEditor`.
 */
export type FilterEditorRef<V = unknown, O = unknown> =
  | string
  | FilterEditor<V, O>
  | FilterEditor<any, any>

/** Context for a custom builder empty state. Its actions ARE the footer's. */
export interface FilterEmptyStateContext {
  /** Appends a condition and opens its attribute picker. */
  addFilter: () => void
  addGroup: () => void
  labels: FilterLabels
  /** Which box the builder is in, for a state that wants to be denser inline. */
  mode: "popover" | "inline"
  /** The bar is locked. A custom state should not offer an action here. */
  readOnly: boolean
}

export interface FilterValueDisplayContext<V = unknown, O = unknown> {
  field: FilterField<V, O>
  labels: FilterLabels
  operator: FilterOperator
  /** Options already resolved for `value`, when the field is option-backed. */
  options: FilterOption<O>[]
  value: V | undefined
  /** `value` normalised to an array, so callbacks never re-derive it. */
  values: unknown[]
}

/* -------------------------------------------------------------------------- */
/*                                   Index                                    */
/* -------------------------------------------------------------------------- */

/** Normalized schema, keyed by SIGNATURE: call sites inline the array. */
export interface FilterIndex<V = unknown, O = unknown> {
  /** Every field in stable, depth-first order. Deep search walks it, and the
   * builder seeds a new row from the FIRST pickable entry, so order is load
   * bearing, not incidental. */
  all: { field: FilterField<V, O>; path: string[] }[]
  /** Every field by its joined path, `"name.first"`. */
  byPath: Map<string, FilterField<V, O>>
  /** Child fields by parent path. Root fields are keyed by `FILTER_ROOT_KEY`. */
  childrenOf: Map<string, FilterField<V, O>[]>
  /** Parent path by path. Empty string for a root field. */
  parentOf: Map<string, string>
  /** Top level fields, in input order. */
  roots: FilterField<V, O>[]
  /** Content hash; equal schemas share one, so a rebuild reuses the index. */
  signature: string
}

/* -------------------------------------------------------------------------- */
/*                                    Draft                                   */
/* -------------------------------------------------------------------------- */

export type FilterDraftStep = "field" | "operator" | "value"

/**
 * The in-flight filter. `cascaderPath` is kept SEPARATE from `path`: `path` is
 * what the user chose, `cascaderPath` is where they were browsing when they
 * chose it, and Back has to return there. Deriving it from `path` breaks the
 * moment a deep search jumps across the tree.
 */
export interface FilterDraft<V = unknown> {
  cascaderPath: string[]
  operator: string | null
  /** The chosen field path. Empty until the field step commits. */
  path: string[]
  query: string
  /** Set when amending an existing rule, null when creating a new one. */
  ruleId: string | null
  /** `"ready"` = complete: the host writes it into the query and closes. The
   * pure reducer decides that, not a click handler. */
  status: "editing" | "ready"
  step: FilterDraftStep
  value: V | undefined
}

/* -------------------------------------------------------------------------- */
/*                                   Labels                                   */
/* -------------------------------------------------------------------------- */

/** Every user facing string. `stepAnnouncement` alone is headless-only. */
export interface FilterLabels {
  /** Accessible name of an option menu's footer (Load more, Retry). */
  actionsLabel: string
  /** Appends a condition to the root group, from the builder's footer. */
  addCondition: string
  addConditionGroup: string
  addFilter: string
  /** A group's own add button: the only keyboard route into a nested group. It
   * NAMES a button that shows `addCondition`, so a translation must contain
   * that string, which is what WCAG Label in Name asks for. */
  addToGroup: string
  advancedFilter: string
  and: string
  apply: string
  back: string
  /** Appended to a branch row's accessible name in the field picker. */
  branchAffordance: string
  /** Empty-state title. The HINT below is withheld from a read-only bar. */
  builderEmpty: string
  builderEmptyHint: string
  /** Names a chip's menu button. The builder's row menu reads the same key. */
  chipMenu: (fieldLabel: string) => string
  clear: string
  clearAll: string
  /** Accessible name of the combinator toggle between two chips. */
  combinator: string
  /** Builder combinator toggle. English "and" wants 58.72px of a 64px track,
   * so the name must CONTAIN the word: truncated, the pill shows "a...". */
  combinatorLabel: (word: string) => string
  /** Chip kebab's route into the builder. Needs `onConvertToAdvanced`. */
  convertToAdvanced: string
  countAnnouncement: (count: number) => string
  discard: string
  duplicate: string
  empty: string
  error: string
  /** The clearing moves nothing on screen, so it is otherwise silent. */
  exclusiveAnnouncement: (label: string, cleared: number) => string
  /** A FRAGMENT, appended after a comma to an exclusive row's accessible name.
   * Warns before the press; `exclusiveAnnouncement` is the receipt after. */
  exclusiveHint: string
  fieldsLabel: string
  filterLabel: (condition: string) => string
  filtersLabel: string
  groupAll: string
  groupAnnouncement: (added: boolean) => string
  groupAny: string
  groupLabel: (description: string, depth: number) => string
  /** Names a group's menu; distinct from `chipMenu`, which is per-rule. */
  groupMenu: string
  groupPlaceholder: string
  /** Appended to a chip with no condition, matching the dashed outline. */
  incomplete: string
  issueEmptyGroup: string
  /** Guidance ("Choose a condition"), not diagnosis: shown three ways over. */
  issueOperator: string
  issueRange: string
  issueRangeOrder: string
  /** The roll-up, and the name of the button that jumps to the first issue. */
  issueSummary: (count: number) => string
  issueValue: string
  itemCount: (count: number) => string
  loading: string
  loadingMore: string
  loadMore: string
  /** A cross-PARENT move; a plain reorder announcement cannot be told apart.
   * `destination` is the group's own headline, or the bar's label at the top
   * level. */
  moveAnnouncement: (
    label: string,
    destination: string,
    position: number,
    total: number
  ) => string
  /** Groups have no names, so they are numbered in document order, one-based. */
  moveToGroup: (position: number) => string
  /** Moves a condition to the root group. The keyboard path to that drag. */
  moveToTopLevel: string
  negate: string
  /** Rendered for a `negated` rule, wrapping the operator label. */
  negated: (operatorLabel: string) => string
  /** Spoken for an empty value: "contains enter text..." is not a name. */
  noValue: string
  or: string
  /** Joins ancestors in a nested field path, "Name > First", for the names
   * `formatFilterPath` builds. The chip draws a decorative chevron instead. */
  pathSeparator: string
  rangeFrom: (fieldLabel: string) => string
  rangeSeparator: string
  rangeTo: (fieldLabel: string) => string
  /** Prose, not ARIA: `aria-readonly` is invalid on toolbar, group and button. */
  readOnly: string
  remove: string
  removeGroup: string
  /** Accessible name of a row's or a group's drag handle. */
  reorder: string
  /** Alt+Arrow is otherwise silent. The total says whether this is the end. */
  reorderAnnouncement: (
    label: string,
    position: number,
    total: number
  ) => string
  /** Description on the drag handle, teaching the Alt+Arrow keyboard model. */
  reorderHint: string
  /** Live-region text after a query narrows an option list or the picker. */
  resultsAnnouncement: (count: number) => string
  retry: string
  /** Names a builder row. Depth is in it: indentation is invisible to AT. */
  rowLabel: (condition: string, depth: number) => string
  searchFields: string
  searchOperators: string
  searchOptions: string
  /** Shown in the operator segment before a condition has been chosen. */
  selectCondition: string
  /** Empty word for an OPTION value; `placeholder` is the search prompt. */
  selectPlaceholder: string
  /** The line above the builder's rows, "In this view, show records". */
  showRecords: string
  /** For a CONSUMER-composed wizard; the shipped flow announces counts. */
  stepAnnouncement: (step: FilterDraftStep, label: string) => string
  /** Dissolves a group into its parent. The inverse of `wrapInGroup`. */
  ungroup: string
  valueCount: (count: number) => string
  /** Spells out the list behind the `valueCount` summary, and contains it. */
  valueDetail: (summary: string, values: string[]) => string
  valuePlaceholder: string
  valueRange: (from: string, to: string) => string
  /** Leading word before the first chip, where a combinator would otherwise go. */
  where: string
  wrapInGroup: string
}

/* -------------------------------------------------------------------------- */
/*                                 Validation                                 */
/* -------------------------------------------------------------------------- */

/** Why a node cannot run as written. `collectFilterIssues` produces these. */
export type FilterIssueReason =
  | "missing-operator"
  | "missing-value"
  | "incomplete-range"
  | "reversed-range"
  | "empty-group"
  /** The one reason whose message is the validator's, not `FilterLabels`. */
  | "custom"

export interface FilterIssue {
  /** WHICH cell to mark. Two reasons share the value cell; groups have none. */
  column: "operator" | "value" | "group"
  /** Set only for `reason: "custom"`; the rest look up `FilterLabels`. */
  message?: string
  nodeId: string
  reason: FilterIssueReason
}

/**
 * What a field's `validate` is handed. Mirrors `FilterValueDisplayContext`.
 * SYNCHRONOUS: issues are collected in a pure memo pass, so a check that has to
 * hit a server belongs in the consumer's own submit path.
 */
export interface FilterValidateContext<V = unknown, O = unknown> {
  /** How many values this operator takes, already resolved. */
  arity: FilterOperatorArity
  field: FilterField<V, O>
  labels: FilterLabels
  operator: FilterOperator
  rule: FilterRule<V>
  value: V | undefined
  values: unknown[]
}
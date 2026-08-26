import type * as React from "react"

/**
 * A node in the cascader tree. Two input shapes normalize to one internal
 * index: nested (nodes carry `children`), or flat adjacency plus the root's
 * `getParent`, which skips the re-nesting step for large datasets.
 */
export interface CascaderNode<T = unknown> {
  children?: CascaderNode<T>[]
  /** Trailing count. Defaults to known children; set it for async nodes. */
  count?: number
  data?: T
  description?: string
  disabled?: boolean
  /** Declares a branch before load; async nodes read as leaves without it. */
  hasChildren?: boolean
  /**
   * Only read on a node nested inside a `getChildren` result. For the level a
   * node OWNS the authoritative signal is that level's `CascaderLoadResult`.
   */
  hasMore?: boolean
  icon?: React.ReactNode
  keywords?: string[]
  label: string
  /** Stable id. Also the committed selection value. */
  value: string
}

/**
 * One footer ACTION. Deliberately not a `CascaderNode`, so a command can never
 * be passed where an option is expected and join the ring, filter or selection.
 */
export interface CascaderActionItem {
  disabled?: boolean
  /** Consecutive entries sharing a heading are drawn under one. */
  group?: string
  icon?: React.ReactNode
  /** Turns the row into a submenu trigger. One level deep on purpose. */
  items?: CascaderActionItem[]
  label: React.ReactNode
  /** Ignored when `items` is present - a flyout opens instead. */
  onSelect?: () => void
  /** Stable key. Falls back to the label when it is a string, then the index. */
  value?: string
}

/** Panel layout. See the docs for the keyboard map of each. */
export type CascaderMode = "drill" | "columns" | "tree"

export type CascaderSearchScope = "level" | "deep"

/**
 * Which nodes may be committed. The predicate arm is generic over the payload
 * rather than quantified per call: a per-call `<T>` would force every predicate
 * to accept EVERY payload, so `(node: CascaderNode<Member>) => boolean` could
 * never satisfy it.
 */
export type CascaderSelectable<T = unknown> =
  | "leaf"
  | "any"
  | ((node: CascaderNode<T>) => boolean)

export type CascaderCollapse = "middle" | "start" | "none"

export type CascaderValueDisplay = "path" | "leaf" | "count"

export type CascaderChangeReason = "select" | "deselect" | "clear"

/** Second argument to `onValueChange`: resolved nodes, so no re-lookup. */
export interface CascaderChangeDetails<T = unknown> {
  /** The node committed or toggled. Null when the selection was cleared. */
  node: CascaderNode<T> | null
  nodes: CascaderNode<T>[]
  /** Ancestor chain of `node`, root first, node last. */
  path: CascaderNode<T>[]
  reason: CascaderChangeReason
}

/** Normalized tree, built once per `items` identity, shared by every mode. */
export interface CascaderIndex<T = unknown> {
  /** Every node in a stable, depth-first order. Used by deep search. */
  all: CascaderNode<T>[]
  byValue: Map<string, CascaderNode<T>>
  /** Children by parent value. Root children are keyed by `ROOT_KEY`. */
  childrenOf: Map<string, CascaderNode<T>[]>
  /** Zero-based depth by node value. */
  depthOf: Map<string, number>
  parentOf: Map<string, string | null>
  /** Top level nodes, in input order. */
  roots: CascaderNode<T>[]
}

export interface CascaderFlatNode<T = unknown> {
  /** Known children, or a declared `hasChildren`. */
  branch: boolean
  depth: number
  expanded: boolean
  node: CascaderNode<T>
  /** One-based index among siblings. */
  posInSet: number
  /** Sibling count, plus one when the level has a paging row. */
  setSize: number
}

/** One segment of a rendered path, after collapsing. */
export type CascaderPathSegment<T = unknown> =
  | { node: CascaderNode<T>; type: "node"; }
  | { hidden: CascaderNode<T>[]; type: "ellipsis"; }

/**
 * Async load state for one node's children. Deliberately WITHOUT a `status`
 * field: "declared a branch, never fetched" and "fetched and genuinely empty"
 * are told apart by MAP MEMBERSHIP, and a second source of that truth would
 * eventually disagree with the first.
 */
export interface CascaderLoadState {
  /** Opaque cursor handed back to `getChildren` for the next page. */
  cursor?: string
  error: boolean
  hasMore: boolean
  loading: boolean
}

/** Why a level was fetched. `resolve`: `resolveValue` hit an unloaded node. */
export type CascaderLoadReason =
  | "level"
  | "more"
  | "prefetch"
  | "retry"
  | "resolve"

/** Argument handed to `getChildren`. */
export interface CascaderLoadContext {
  cursor?: string
  reason?: CascaderLoadReason
  /** Aborted when the request is superseded or the popup closes. */
  signal: AbortSignal
}

/** Value returned by `getChildren`. A bare array is also accepted. */
export interface CascaderLoadResult<T = unknown> {
  /** Defaults to whether `nextCursor` was supplied. */
  hasMore?: boolean
  items: CascaderNode<T>[]
  nextCursor?: string
}

/** Argument handed to `onSearch`. */
export interface CascaderSearchContext {
  /** The path the user is searching within, deepest last. */
  path: string[]
  signal: AbortSignal
}

/**
 * Every user facing string, so the primitive ships no hardcoded copy. The
 * callbacks take plain labels, not nodes: a `CascaderNode<T>` parameter would
 * force this object to carry the item generic. `*Announcement` is live-region.
 */
export interface CascaderLabels {
  actionsLabel: string
  back: string
  /** Appended to a branch row's name outside tree mode: it opens another list. */
  branchAffordance: string
  breadcrumbLabel: string
  /** `count` is the descendants swept along; `selecting` is the direction. */
  cascadeAnnouncement: (
    label: string,
    count: number,
    selecting: boolean
  ) => string
  chipsLabel: string
  collapsedAnnouncement: (label: string) => string
  columnsLabel: string
  empty: string
  error: string
  expandedAnnouncement: (label: string, count: number) => string
  itemCount: (count: number) => string
  /** Read per mode AND per direction: the level keys mirror in RTL. */
  keyboardHint: (mode: CascaderMode, dir: "ltr" | "rtl") => string
  levelAnnouncement: (
    parentLabel: string,
    depth: number,
    count: number
  ) => string
  /** A level's FIRST page. `loadingMore` is the next, `loadMore` its idle row. */
  loading: string
  loadingMore: string
  loadMore: string
  maxReachedAnnouncement: (max: number) => string
  panelLabel: string
  /** Same for the mixed state, which a `role="button"` row may not carry. */
  partiallySelectedState: string
  /** Trail separator. Not every locale writes one with a slash. */
  pathSeparator: string
  removeChip: (label: string) => string
  resultsAnnouncement: (count: number) => string
  retry: string
  rootAnnouncement: (count: number) => string
  /** Names the root level wherever there is no parent node to name it. */
  rootLevel: string
  search: string | ((parentLabel?: string) => string)
  searchingAnnouncement: string
  /** Rendered by `CascaderValue` when `display="count"`. */
  selectedCount: (count: number) => string
  /** Columns-trail rows are plain buttons, so they carry no `aria-selected`. */
  selectedState: string
  submenuAffordance: string
}
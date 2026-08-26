import type { OnChangeFn, PaginationState } from "@tanstack/react-table";

import { useLocation, useNavigation } from "react-router";

/**
 * The shared URL-backed pagination wiring for our server-driven data grids.
 *
 * Every list grid works the same way: the loader owns the data, the grid runs
 * `manualPagination`, and a page change is pushed into the URL so the loader
 * re-runs. That's three near-identical blocks per grid (derive `pagination`,
 * unwrap tanstack's updater, merge back into params) — this is that logic, once.
 *
 * It also resolves the grid's PENDING state, which belongs here rather than at
 * the call site: "is this list reloading?" is a question about the very
 * navigation this hook causes. See {@link GridPagination.isLoading}.
 */

/** The slice of a list-params object this hook touches. Each list has its own
 * params type (filters, sort, …); all we need is the page cursor. */
export interface GridPaginationParams {
  page?: number;
  pageSize?: number;
}

export interface GridPagination {
  /**
   * True only while THIS list is reloading — i.e. a navigation that keeps the
   * same pathname and changes only the query.
   *
   * The pathname check is the important part. A bare
   * `navigation.state === "loading"` is also true when the user clicks a row and
   * navigates AWAY to a detail page, which would flash skeleton rows over the
   * table they're leaving.
   */
  isLoading: boolean;
  onPaginationChange: OnChangeFn<PaginationState>;
  pagination: PaginationState;
}

export function useGridPagination<TParams extends GridPaginationParams>({
  params,
  onParamsChange,
  defaultPageSize,
}: {
  defaultPageSize: number;
  onParamsChange: (next: TParams) => void;
  params: TParams;
}): GridPagination {
  const navigation = useNavigation();
  const location = useLocation();

  const pageSize = params.pageSize ?? defaultPageSize;
  // The URL is 1-based (human-facing); tanstack is 0-based.
  const pagination: PaginationState = {
    pageIndex: (params.page ?? 1) - 1,
    pageSize,
  };

  const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === "function" ? updater(pagination) : updater;
    onParamsChange({
      ...params,
      page: next.pageIndex + 1,
      pageSize: next.pageSize,
    });
  };

  const isLoading =
    navigation.state === "loading" &&
    navigation.location?.pathname === location.pathname;

  return { pagination, onPaginationChange, isLoading };
}

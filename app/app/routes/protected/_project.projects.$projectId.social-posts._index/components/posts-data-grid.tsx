import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import type {
  SocialPost,
  SocialPostListParams,
} from "~/lib/types/social-post";

import { AccountAvatars } from "~/components/account-avatars";
import {
  DataGrid,
  DataGridContainer,
} from "~/components/data-grid/data-grid";
import { DataGridColumnHeader } from "~/components/data-grid/data-grid-column-header";
import { DataGridPagination } from "~/components/data-grid/data-grid-pagination";
import { DataGridTable } from "~/components/data-grid/data-grid-table";
import { IdCell, RowLink } from "~/components/grid-cells";
import { PostStatusIcon } from "~/components/post-status";
import { useGridPagination } from "~/hooks/use-grid-pagination";
import { MediaIcon, TextIcon } from "~/icons";
import { DEFAULT_PAGE_SIZE } from "~/lib/types/social-account";
import { cn } from "~/lib/utils";
import { LocaleDateTime } from "~/ui/date-time";

/**
 * The dumb posts grid (PFM-703). It renders the page the loader handed it and
 * reflects pagination back into the URL via `onParamsChange` (`manualPagination`),
 * so the loader re-runs and the server stays the source of truth. The API list
 * has no sort, so columns are unsortable and their headers are plain labels; the
 * accounts cell shows identity only (no per-account result badge — that lives on
 * the detail page). Row click → the post detail page. There are no per-row
 * actions (posts are authored elsewhere); ids truncate by default so the table
 * doesn't normally scroll, and the grid forces a min width so it scrolls rather
 * than crushing on narrow viewports.
 */
export function PostsDataGrid({
  posts,
  total,
  params,
  onParamsChange,
}: {
  onParamsChange: (next: SocialPostListParams) => void;
  params: SocialPostListParams;
  posts: SocialPost[];
  total: number;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { pagination, onPaginationChange, isLoading } = useGridPagination({
    params,
    onParamsChange,
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });

  const columns = useMemo<ColumnDef<SocialPost>[]>(
    () => [
      {
        accessorKey: "caption",
        header: ({ column }) => (
          <DataGridColumnHeader title={t("socialPosts.columns.caption")} column={column} />
        ),
        cell: ({ row }) => {
          const { hasMedia } = row.original;
          const caption = row.original.caption.trim();
          const MediaGlyph = hasMedia ? MediaIcon : TextIcon;
          return (
            // The caption cell is this row's navigating link — it's what makes
            // the row reachable by keyboard and Cmd/middle-clickable.
            <RowLink to={`/social-posts/${row.original.id}`}>
              <div className="flex min-w-0 items-center gap-2">
                <MediaGlyph
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-label={t(
                    hasMedia
                      ? "socialPosts.media.hasMedia"
                      : "socialPosts.media.textOnly",
                  )}
                />
                <span
                  className={cn(
                    "truncate",
                    caption ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {caption || t("socialPosts.noCaption")}
                </span>
              </div>
            </RowLink>
          );
        },
        enableSorting: false,
        size: 300,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataGridColumnHeader title={t("socialPosts.columns.status")} column={column} />
        ),
        cell: ({ row }) => (
          <div className="flex justify-center">
            <PostStatusIcon status={row.original.status} />
          </div>
        ),
        enableSorting: false,
        size: 80,
      },
      {
        id: "accounts",
        header: ({ column }) => (
          <DataGridColumnHeader title={t("socialPosts.columns.accounts")} column={column} />
        ),
        cell: ({ row }) => <AccountAvatars accounts={row.original.accounts} />,
        enableSorting: false,
        size: 200,
      },
      {
        accessorKey: "postAt",
        header: ({ column }) => (
          <DataGridColumnHeader title={t("socialPosts.columns.postAt")} column={column} />
        ),
        cell: ({ row }) => (
          <LocaleDateTime
            value={row.original.postAt}
            className="text-muted-foreground"
          />
        ),
        enableSorting: false,
        size: 180,
      },
      {
        accessorKey: "id",
        header: ({ column }) => (
          <DataGridColumnHeader title={t("socialPosts.columns.pfmId")} column={column} />
        ),
        cell: ({ row }) => (
          <IdCell
            value={row.original.id}
            label={t("socialPosts.actions.copyPfmId")}
          />
        ),
        enableSorting: false,
        size: 200,
      },
      {
        accessorKey: "externalId",
        header: ({ column }) => (
          <DataGridColumnHeader title={t("socialPosts.columns.externalId")} column={column} />
        ),
        cell: ({ row }) =>
          row.original.externalId ? (
            <IdCell
              value={row.original.externalId}
              label={t("socialPosts.actions.copyExternalId")}
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        enableSorting: false,
        size: 180,
      },
    ],
    [t],
  );

  const table = useReactTable({
    data: posts,
    columns,
    pageCount: Math.max(1, Math.ceil(total / pagination.pageSize)),
    state: { pagination },
    onPaginationChange,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <DataGrid
      table={table}
      recordCount={total}
      // Paging round-trips to the loader, so the grid renders `pageSize`
      // skeleton rows (the default `loadingMode`) instead of holding stale ones
      // with no feedback.
      isLoading={isLoading}
      tableLayout={{
        rowBorder: true,
        width: "fixed",
      }}
      // Force a min content width so narrow viewports scroll the table
      // horizontally instead of crushing the columns (the `!` beats the
      // grid's own `min-w-full`).
      tableClassNames={{ base: "min-w-[52rem]!" }}
      emptyMessage={t("socialPosts.grid.empty")}
      onRowClick={(post) => navigate(`/social-posts/${post.id}`)}
    >
      <div className="w-full space-y-2.5">
        <DataGridContainer>
          <div className="overflow-x-auto">
            <DataGridTable />
          </div>
        </DataGridContainer>
        <DataGridPagination />
      </div>
    </DataGrid>
  );
}

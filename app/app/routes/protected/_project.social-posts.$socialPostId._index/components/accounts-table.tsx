import type { ExpandedState } from "@tanstack/react-table";

import { type ColumnDef, useTable } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import type { DataGridFeatures } from "~/components/data-grid/data-grid";
import type { PostAccountResult } from "~/lib/types/social-post";

import { CopyableId } from "~/components/copyable-id";
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
} from "~/components/data-grid/data-grid";
import { DataGridColumnHeader } from "~/components/data-grid/data-grid-column-header";
import { DataGridTable } from "~/components/data-grid/data-grid-table";
import { PostsIcon } from "~/icons";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/ui/empty";
import { Skeleton } from "~/ui/skeleton";

import {
  AccountIdentityCell,
  AccountOverridesPanel,
  AccountPostUrlCell,
  AccountStatusCell,
} from "./accounts-table-row";

/** See the note in the API keys table — this fan-out has no pagination either. */
const SKELETON_ROW_COUNT = 3;

/**
 * The accounts fan-out: one row per targeted account, retaining the legacy
 * identifier columns, with an empty state when the post targets none.
 *
 * Built on the shared DataGrid rather than hand-rolled `<table>` markup, so it
 * inherits the same shell, density, and skeleton treatment as every other table
 * in the app. An account whose resolved config diverges from the global base
 * carries an attached sub-row ({@link AccountOverridesPanel}) through the grid's
 * expanded-row slot.
 */
export function AccountsTable({
  accounts,
  isLoading = false,
}: {
  accounts: PostAccountResult[];
  /** Renders the loading skeleton in place of rows — see the route's Suspense boundary. */
  isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const columns = useMemo<ColumnDef<DataGridFeatures, PostAccountResult>[]>(
    () => [
      {
        id: "account",
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t("socialPosts.detail.table.account")}
            column={column}
          />
        ),
        cell: ({ row }) => <AccountIdentityCell result={row.original} />,
        enableSorting: false,
        size: 240,
        meta: {
          // The sub-row hangs off this column: the grid takes the first
          // `expandedContent` it finds across the column set.
          expandedContent: (result: PostAccountResult) => (
            <AccountOverridesPanel result={result} />
          ),
          skeleton: (
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-6 shrink-0 rounded-full" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ),
        },
      },
      {
        id: "status",
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t("socialPosts.detail.table.status")}
            column={column}
          />
        ),
        cell: ({ row }) => <AccountStatusCell result={row.original} />,
        enableSorting: false,
        size: 140,
        meta: {
          skeleton: (
            <div className="flex items-center gap-1.5">
              <Skeleton className="size-2 shrink-0 rounded-full" />
              <Skeleton className="h-3.5 w-14" />
            </div>
          ),
        },
      },
      {
        id: "resultId",
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t("socialPosts.detail.table.resultId")}
            column={column}
          />
        ),
        cell: ({ row }) => (
          <CopyableId
            value={row.original.resultId}
            copyLabel={t("socialPosts.detail.copyResultId")}
          />
        ),
        enableSorting: false,
        size: 200,
        meta: { skeleton: <Skeleton className="h-3.5 w-32" /> },
      },
      {
        id: "accountId",
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t("socialPosts.detail.table.accountId")}
            column={column}
          />
        ),
        cell: ({ row }) => (
          <CopyableId
            value={row.original.account.id}
            copyLabel={t("socialPosts.detail.copyAccountId")}
          />
        ),
        enableSorting: false,
        size: 200,
        meta: { skeleton: <Skeleton className="h-3.5 w-32" /> },
      },
      {
        id: "platformPostId",
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t("socialPosts.detail.table.platformPostId")}
            column={column}
          />
        ),
        cell: ({ row }) => (
          <CopyableId
            value={row.original.providerPostId}
            copyLabel={t("socialPosts.detail.copyProviderPostId")}
          />
        ),
        enableSorting: false,
        size: 200,
        meta: { skeleton: <Skeleton className="h-3.5 w-28" /> },
      },
      {
        id: "url",
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t("socialPosts.detail.table.url")}
            column={column}
          />
        ),
        cell: ({ row }) => <AccountPostUrlCell result={row.original} />,
        enableSorting: false,
        size: 240,
        meta: { skeleton: <Skeleton className="h-3 w-40" /> },
      },
    ],
    [t],
  );

  // Derived from the data, not from user interaction: an account with
  // overrides is held open so its labelled caret bar is always visible, which
  // is what the hand-written `<tbody>` markup did. Nothing in the UI toggles
  // grid expansion — the caret inside the panel toggles only its own list — so
  // this slice is intentionally controlled with no change handler.
  const expanded = useMemo<ExpandedState>(
    () =>
      Object.fromEntries(
        accounts
          .filter((result) => result.overrides.length > 0)
          .map((result) => [result.account.id, true]),
      ),
    [accounts],
  );

  const table = useTable({
    features: dataGridFeatures,
    data: accounts,
    columns,
    getRowId: (row) => row.account.id,
    state: { expanded },
    initialState: {
      pagination: { pageIndex: 0, pageSize: SKELETON_ROW_COUNT },
    },
    manualPagination: true,
  });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-sm font-semibold text-foreground">
        {t("socialPosts.detail.accountsTitle", { count: accounts.length })}
      </h2>
      {accounts.length === 0 && !isLoading ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PostsIcon />
            </EmptyMedia>
            <EmptyTitle>{t("socialPosts.detail.resultsEmptyTitle")}</EmptyTitle>
            <EmptyDescription>
              {t("socialPosts.detail.resultsEmpty")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataGrid
          table={table}
          recordCount={accounts.length}
          isLoading={isLoading}
          tableLayout={{ rowBorder: true, width: "fixed" }}
          tableClassNames={{ base: "min-w-[72rem]!" }}
          emptyMessage={t("socialPosts.detail.resultsEmpty")}
          // Only a row that produced a result has somewhere to go.
          onRowClick={(result) =>
            result.resultId
              ? navigate(`/social-post-results/${result.resultId}`)
              : undefined
          }
        >
          <DataGridContainer>
            <div className="overflow-x-auto">
              <DataGridTable />
            </div>
          </DataGridContainer>
        </DataGrid>
      )}
    </section>
  );
}

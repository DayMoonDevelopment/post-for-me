import {
  type ColumnDef,
  useTable,
} from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import type { DataGridFeatures } from "~/components/data-grid/data-grid";
import type {
  SocialAccount,
  SocialAccountListParams,
} from "~/lib/types/social-account";

import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
} from "~/components/data-grid/data-grid";
import { DataGridColumnHeader } from "~/components/data-grid/data-grid-column-header";
import { DataGridPagination } from "~/components/data-grid/data-grid-pagination";
import { DataGridTable } from "~/components/data-grid/data-grid-table";
import { IdCell, RowLink } from "~/components/grid-cells";
import { SocialAccountAvatar } from "~/components/social-account-avatar";
import { useGridPagination } from "~/hooks/use-grid-pagination";
import { CopyIcon, DisconnectIcon, EyeIcon, MoreIcon } from "~/icons";
import { platformMeta } from "~/lib/platform-meta";
import { DEFAULT_PAGE_SIZE } from "~/lib/types/social-account";
import { Button } from "~/ui/button";
import { useCopyToClipboard } from "~/ui/copyable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/ui/dropdown-menu";
import { toast } from "~/ui/sonner";

/** Format an ISO timestamp in the viewer's locale (medium date). */
function formatConnectedAt(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(iso),
  );
}

/** The trailing 3-dot menu: copy each id, view, disconnect. */
function RowActions({
  account,
  onDisconnect,
}: {
  account: SocialAccount;
  onDisconnect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { copy } = useCopyToClipboard();

  // Copy + a sonner confirmation naming exactly what was copied — the menu items
  // have no inline copied-state affordance of their own (unlike the in-cell
  // Copyable), so the toast is the feedback.
  function handleCopy(value: string, message: string) {
    void copy(value);
    toast.success(message);
  }

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("socialAccounts.actions.menu")}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreIcon />
            </Button>
          }
        />
        <DropdownMenuContent
          align="end"
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownMenuItem
            onClick={() =>
              handleCopy(account.id, t("socialAccounts.actions.copiedPfmId"))
            }
          >
            <CopyIcon />
            {t("socialAccounts.actions.copyPfmId")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              handleCopy(
                account.platformId,
                t("socialAccounts.actions.copiedPlatformId"),
              )
            }
          >
            <CopyIcon />
            {t("socialAccounts.actions.copyPlatformId")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!account.externalId}
            onClick={() =>
              account.externalId
                ? handleCopy(
                    account.externalId,
                    t("socialAccounts.actions.copiedExternalId"),
                  )
                : undefined
            }
          >
            <CopyIcon />
            {t("socialAccounts.actions.copyExternalId")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => navigate(`/social-accounts/${account.id}`)}
          >
            <EyeIcon />
            {t("socialAccounts.actions.view")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={account.status === "disconnected"}
            onClick={() => onDisconnect(account.id)}
          >
            <DisconnectIcon />
            {t("socialAccounts.actions.disconnect")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * The dumb accounts grid (PFM-692). It renders the page the loader handed it and
 * reflects pagination back into the URL via `onParamsChange`
 * (`manualPagination`), so the loader re-runs and the server stays the source of
 * truth. The API list has no sort, so columns are unsortable and their headers
 * are plain labels. Identity implies status on the avatar dot — there is no
 * status column and no token columns. The trailing actions column is pinned to
 * the right edge so it stays visible if the table ever scrolls; ids truncate by
 * default so it normally doesn't.
 */
export function AccountsDataGrid({
  accounts,
  total,
  params,
  onParamsChange,
  onDisconnect,
}: {
  accounts: SocialAccount[];
  onDisconnect: (id: string) => void;
  onParamsChange: (next: SocialAccountListParams) => void;
  params: SocialAccountListParams;
  total: number;
}) {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();

  const { pagination, onPaginationChange, isLoading } = useGridPagination({
    params,
    onParamsChange,
    defaultPageSize: DEFAULT_PAGE_SIZE,
  });

  const columns = useMemo<ColumnDef<DataGridFeatures, SocialAccount>[]>(
    () => [
      {
        accessorKey: "username",
        header: ({ column }) => (
          <DataGridColumnHeader title={t("socialAccounts.columns.identity")} column={column} />
        ),
        cell: ({ row }) => {
          const account = row.original;
          const meta = platformMeta(account.platform);
          const PlatformIcon = meta?.icon;
          return (
            // The identity cell is this row's navigating link — it's what makes
            // the row reachable by keyboard and Cmd/middle-clickable.
            <RowLink to={`/social-accounts/${account.id}`}>
              <div className="flex min-w-0 items-center gap-2.5">
                <SocialAccountAvatar
                  account={account}
                  size="sm"
                  ringClassName="ring-background"
                />
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-medium leading-tight text-foreground">
                    {account.username ?? account.platformId}
                  </span>
                  <span className="flex min-w-0 items-center gap-1 leading-tight text-muted-foreground">
                    {PlatformIcon ? (
                      <PlatformIcon className="size-3 shrink-0" />
                    ) : null}
                    <span className="truncate">
                      {meta?.label ?? account.platform}
                    </span>
                  </span>
                </div>
              </div>
            </RowLink>
          );
        },
        enableSorting: false,
        size: 240,
      },
      {
        accessorKey: "id",
        header: ({ column }) => (
          <DataGridColumnHeader title={t("socialAccounts.columns.pfmId")} column={column} />
        ),
        cell: ({ row }) => (
          <IdCell
            value={row.original.id}
            label={t("socialAccounts.actions.copyPfmId")}
          />
        ),
        enableSorting: false,
        size: 200,
      },
      {
        accessorKey: "platformId",
        header: ({ column }) => (
          <DataGridColumnHeader title={t("socialAccounts.columns.platformId")} column={column} />
        ),
        cell: ({ row }) => (
          <IdCell
            value={row.original.platformId}
            label={t("socialAccounts.actions.copyPlatformId")}
          />
        ),
        enableSorting: false,
        size: 180,
      },
      {
        accessorKey: "externalId",
        header: ({ column }) => (
          <DataGridColumnHeader title={t("socialAccounts.columns.externalId")} column={column} />
        ),
        cell: ({ row }) =>
          row.original.externalId ? (
            <IdCell
              value={row.original.externalId}
              label={t("socialAccounts.actions.copyExternalId")}
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        enableSorting: false,
        size: 180,
      },
      {
        accessorKey: "connectedAt",
        header: ({ column }) => (
          <DataGridColumnHeader title={t("socialAccounts.columns.connected")} column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.connectedAt
              ? formatConnectedAt(row.original.connectedAt, i18n.language)
              : "—"}
          </span>
        ),
        enableSorting: false,
        size: 140,
      },
      {
        id: "actions",
        // No visible label, but the header cell still needs an accessible name
        // — an empty `<th>` leaves screen-reader table navigation announcing an
        // unnamed column.
        header: () => (
          <span className="sr-only">{t("common.actions")}</span>
        ),
        cell: ({ row }) => (
          <RowActions account={row.original} onDisconnect={onDisconnect} />
        ),
        enableSorting: false,
        size: 56,
      },
    ],
    [t, onDisconnect],
  );

  const table = useTable({
    features: dataGridFeatures,
    data: accounts,
    columns,
    pageCount: Math.max(1, Math.ceil(total / pagination.pageSize)),
    state: { pagination },
    onPaginationChange,
    manualPagination: true,
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
      tableClassNames={{ base: "min-w-[48rem]!" }}
      emptyMessage={t("socialAccounts.grid.empty")}
      onRowClick={(account) => navigate(`/social-accounts/${account.id}`)}
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

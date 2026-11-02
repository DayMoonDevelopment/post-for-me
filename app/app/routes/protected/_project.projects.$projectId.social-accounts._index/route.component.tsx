import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigation,
  useSearchParams,
} from "react-router";

import type { SocialAccountListParams } from "~/lib/types/social-account";

import { ConfirmDialog } from "~/components/confirm-dialog";
import {
  ConnectAccountModal,
  ConnectAccountModalTrigger,
} from "~/components/connect-account";
import { SubscriptionRequired } from "~/components/subscription-required";
import { useActionErrorToast } from "~/hooks/use-action-error-toast";
import { AddIcon, SocialAccountsIcon } from "~/icons";
import { isActionError } from "~/lib/action-result";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/ui/empty";

import type { loader } from "./route.loader";

import { AccountFilters } from "./components/account-filters";
import { AccountsDataGrid } from "./components/accounts-data-grid";
import { parseListParams, serializeListParams } from "./schemas/list-params";

/**
 * Social Accounts list page (PFM-691). Full-bleed header + placeholder connect
 * CTA, the filter bar, and the server-driven grid, all read from the real API
 * via a temporary project key. When the API is unavailable (no subscription /
 * misconfig) an in-page notice replaces the grid. Disconnect is driven by a
 * {@link ConfirmDialog}, posting its intent to this route's action through a
 * `useFetcher` (its in-flight state powers the dialog spinner; a successful
 * result closes the dialog, a failure toasts and keeps it open). When there are
 * no accounts AND no active filter, an empty state replaces the grid.
 */
export function Component() {
  const { result, unavailable, reason, teamId } =
    useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const [, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const location = useLocation();

  // Drive the filter/page UI from the *pending* navigation URL when one is in
  // flight, so removing a filter (or any param change) reflects immediately —
  // the chip disappears the moment you click, even though the table is still
  // reloading the data. Falls back to the committed URL when idle.
  const params = useMemo(
    () =>
      parseListParams(
        new URLSearchParams(navigation.location?.search ?? location.search),
      ),
    [navigation.location?.search, location.search],
  );

  const fetcher = useFetcher();
  useActionErrorToast(fetcher);
  const pending = fetcher.state !== "idle";

  const [disconnectId, setDisconnectId] = useState<string | null>(null);

  // A successful mutation revalidates the list; close the disconnect dialog.
  useEffect(() => {
    if (
      fetcher.state === "idle" &&
      fetcher.data &&
      !isActionError(fetcher.data)
    ) {
      setDisconnectId(null);
    }
  }, [fetcher.state, fetcher.data]);

  const updateParams = useCallback(
    (next: SocialAccountListParams) => {
      setSearchParams(serializeListParams(next), { preventScrollReset: true });
    },
    [setSearchParams],
  );

  function submitDisconnect(id: string) {
    fetcher.submit({ intent: "disconnect", id }, { method: "post" });
  }

  const hasActiveQuery = Boolean(
    params.platform?.length ||
      params.status?.length ||
      params.username ||
      params.externalId,
  );
  // Only fall to the empty state when settled — avoids flashing it mid-reload
  // (when `result` is still the previous query's data).
  const showEmptyState =
    !unavailable &&
    result.total === 0 &&
    !hasActiveQuery &&
    navigation.state === "idle";

  // The connect entry point: opens the two-panel connect modal directly (which
  // owns the platform picker), so there's no separate dropdown/platform screen.
  // The empty state and the filter bar are mutually exclusive branches, so this
  // element only ever mounts once.
  const connectAccount = (
    <ConnectAccountModal
      trigger={
        <ConnectAccountModalTrigger className="shrink-0">
          <AddIcon aria-hidden />
          {t("setup.connectAccount.trigger")}
        </ConnectAccountModalTrigger>
      }
    />
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-heading text-2xl font-semibold text-foreground">
        {t("socialAccounts.pageTitle")}
      </h1>

      {unavailable ? (
        <SubscriptionRequired
          namespace="socialAccounts.unavailable"
          reason={reason ?? "error"}
          teamId={teamId}
        />
      ) : showEmptyState ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SocialAccountsIcon />
            </EmptyMedia>
            <EmptyTitle>{t("socialAccounts.empty.title")}</EmptyTitle>
            <EmptyDescription>
              {t("socialAccounts.empty.description")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{connectAccount}</EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          <AccountFilters
            params={params}
            onParamsChange={updateParams}
            connectSlot={connectAccount}
          />
          <AccountsDataGrid
            accounts={result.accounts}
            total={result.total}
            params={params}
            onParamsChange={updateParams}
            onDisconnect={setDisconnectId}
          />
        </div>
      )}

      <ConfirmDialog
        open={disconnectId !== null}
        onOpenChange={(open) => (open ? undefined : setDisconnectId(null))}
        title={t("socialAccounts.disconnect.title")}
        description={t("socialAccounts.disconnect.description")}
        confirmLabel={t("socialAccounts.disconnect.confirm")}
        cancelLabel={t("socialAccounts.disconnect.cancel")}
        destructive
        pending={pending}
        onConfirm={() =>
          disconnectId ? submitDisconnect(disconnectId) : undefined
        }
      />
    </div>
  );
}

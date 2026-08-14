import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFetcher } from "react-router";

import type { SocialAccount } from "~/lib/types/social-account";

import { ConfirmDialog } from "~/components/confirm-dialog";
import {
  DangerZone,
  DangerZoneActions,
  DangerZoneDescription,
  DangerZoneHeader,
  DangerZoneTitle,
} from "~/components/danger-zone";
import { useActionErrorToast } from "~/hooks/use-action-error-toast";
import { DisconnectIcon } from "~/icons";
import { isActionError } from "~/lib/action-result";
import { Button } from "~/ui/button";

/**
 * The detail page's danger zone, mirroring the Project Settings danger zone: a
 * destructive-framed card whose action is disconnect (clears tokens, keeps the
 * row → reads as `disconnected`). The API has no hard-delete — accounts are
 * disconnected, not removed.
 *
 * Disconnect posts to the page's own action through a `useFetcher` and
 * revalidates in place, so its dialog closes itself on success; a failure toasts
 * and leaves the dialog open.
 */
export function AccountDangerZone({ account }: { account: SocialAccount }) {
  const { t } = useTranslation();
  const fetcher = useFetcher();
  useActionErrorToast(fetcher);
  const pending = fetcher.state !== "idle";

  const [disconnectOpen, setDisconnectOpen] = useState(false);

  // A successful disconnect revalidates (no redirect) — close its dialog.
  useEffect(() => {
    if (
      fetcher.state === "idle" &&
      fetcher.data &&
      !isActionError(fetcher.data)
    ) {
      setDisconnectOpen(false);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <DangerZone>
      <DangerZoneHeader>
        <DangerZoneTitle>
          {t("socialAccounts.detail.dangerTitle")}
        </DangerZoneTitle>
        <DangerZoneDescription>
          {t("socialAccounts.detail.dangerDescription")}
        </DangerZoneDescription>
      </DangerZoneHeader>

      <DangerZoneActions>
        <Button
          type="button"
          variant="secondary"
          disabled={account.status === "disconnected"}
          onClick={() => setDisconnectOpen(true)}
        >
          <DisconnectIcon />
          {t("socialAccounts.actions.disconnect")}
        </Button>
      </DangerZoneActions>

      <ConfirmDialog
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        title={t("socialAccounts.disconnect.title")}
        description={t("socialAccounts.disconnect.description")}
        confirmLabel={t("socialAccounts.disconnect.confirm")}
        cancelLabel={t("socialAccounts.disconnect.cancel")}
        destructive
        pending={pending}
        onConfirm={() => fetcher.submit({ intent: "disconnect" }, { method: "post" })}
      />
    </DangerZone>
  );
}

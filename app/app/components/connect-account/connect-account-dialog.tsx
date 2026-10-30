import type * as React from "react";

import { useTranslation } from "react-i18next";

import { ModalClose, ModalTrigger } from "~/components/modal";
import {
  SetupActionDialog,
  type SetupActionDialogProps,
} from "~/components/setup-action-dialog";
import { Button } from "~/ui/button";

import { ConnectAccountContent } from "./connect-account-content";

/**
 * "Connect a social account" as a self-contained modal. Reusable anywhere
 * connecting an account makes sense — the launchpad checklist's "Get started",
 * an empty-state on the accounts page, a header button, etc. — not just during
 * onboarding. The guided-tour instead renders {@link ConnectAccountContent}
 * directly, so the same step content appears in both display types.
 */
export function ConnectAccountDialog({
  open,
  onOpenChange,
  defaultOpen,
  trigger,
}: SetupActionDialogProps) {
  const { t } = useTranslation();
  return (
    <SetupActionDialog
      open={open}
      onOpenChange={onOpenChange}
      defaultOpen={defaultOpen}
      trigger={trigger}
      title={t("setup.connectAccount.title")}
      footer={
        // PLACEHOLDER action: closes the step. Real OAuth completion wires here.
        <ModalClose render={<Button />}>
          {t("setup.connectAccount.cta")}
        </ModalClose>
      }
    >
      <ConnectAccountContent />
    </SetupActionDialog>
  );
}

/**
 * The default trigger presentation for connecting an account, so the same
 * button reads consistently wherever it's dropped. Render it through the
 * dialog's `trigger` prop:
 *
 *   <ConnectAccountDialog trigger={<ConnectAccountTrigger />} />
 */
export function ConnectAccountTrigger({
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { t } = useTranslation();
  return (
    <ModalTrigger render={<Button {...props} />}>
      {children ?? t("setup.connectAccount.trigger")}
    </ModalTrigger>
  );
}

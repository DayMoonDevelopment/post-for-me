import { useTranslation } from "react-i18next";

import { ModalClose } from "~/components/modal";
import {
  SetupActionDialog,
  type SetupActionDialogProps,
} from "~/components/setup-action-dialog";
import { Button } from "~/ui/button";

import { ApiKeyContent } from "./api-key-content";

/** "Create your first API key" as a self-contained modal. */
export function ApiKeyDialog({
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
      title={t("setup.apiKey.title")}
      footer={
        // PLACEHOLDER: real key generation wires here.
        <ModalClose render={<Button />}>{t("setup.apiKey.cta")}</ModalClose>
      }
    >
      <ApiKeyContent />
    </SetupActionDialog>
  );
}

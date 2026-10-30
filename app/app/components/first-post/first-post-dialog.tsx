import { useTranslation } from "react-i18next";

import { ModalClose } from "~/components/modal";
import {
  SetupActionDialog,
  type SetupActionDialogProps,
} from "~/components/setup-action-dialog";
import { Button } from "~/ui/button";

import { FirstPostContent } from "./first-post-content";

/** "Publish your first post" as a self-contained modal. */
export function FirstPostDialog({
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
      title={t("setup.firstPost.title")}
      footer={
        // PLACEHOLDER: real post composer + publish wires here.
        <ModalClose render={<Button />}>{t("setup.firstPost.cta")}</ModalClose>
      }
    >
      <FirstPostContent />
    </SetupActionDialog>
  );
}

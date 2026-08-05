import * as React from "react";
import { useTranslation } from "react-i18next";

import {
  Modal,
  ModalContent,
  ModalTitle,
  ModalTrigger,
} from "~/components/modal";
import { EditIcon } from "~/icons";
import { Button } from "~/ui/button";

/**
 * The settings page's "intentional edit" affordance: a small Edit button that
 * opens a focused dialog whose body is one of the shared `ProjectConfigSection`
 * forms. The page itself stays read-only; editing is always a deliberate step.
 *
 * `children` is a render prop given a `close` callback — pass it as the section's
 * `onSaved` so a successful save dismisses the dialog (and the read-only row
 * revalidates to the new value underneath). The section supplies its own
 * heading + Save control, so this just provides the chrome and the trigger.
 */
export function SectionEditDialog({
  title,
  label,
  children,
}: {
  children: (close: () => void) => React.ReactNode;
  /** Optional override for the trigger label (defaults to "Edit"). */
  label?: string;
  /** Screen-reader dialog title (the section renders its own visible heading). */
  title: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <EditIcon />
        {label ?? t("common.edit")}
      </ModalTrigger>
      <ModalContent
        layout="simple"
        data-slot="section-edit-dialog"
        className="max-w-lg"
      >
        <ModalTitle className="sr-only">{title}</ModalTitle>
        {children(close)}
      </ModalContent>
    </Modal>
  );
}

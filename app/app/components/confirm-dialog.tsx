import * as React from "react";
import { useTranslation } from "react-i18next";

import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "~/components/modal";
import { Button } from "~/ui/button";
import { Field, FieldLabel } from "~/ui/field";
import { Input } from "~/ui/input";
import { Spinner } from "~/ui/spinner";

/**
 * A reusable confirmation dialog. Drop it anywhere an action needs a "are you
 * sure?" gate — pass a `trigger` and an `onConfirm`. Confirmation strength is
 * configurable and composable:
 *
 * - **Yes/no** (default): just Cancel + Confirm.
 * - **Type-to-confirm**: set `requireText` and Confirm stays disabled until the
 *   user types that exact string (e.g. the project name).
 * - **Double confirm**: set `confirmStep` to stage it into two screens. With a
 *   `requireText`, step 1 holds the editable type-to-confirm input (the advance
 *   button is disabled until it matches), and step 2 is the final "are you sure?"
 *   beat — same input shown DISABLED as a locked reminder, with the destructive
 *   confirm. Without `requireText`, it's a plain summary → Continue → confirm.
 *
 * These combine freely — e.g. delete project uses `confirmStep` AND `requireText`:
 * step 1 type the name + "Delete project"; step 2 "Are you sure?" + "Permanently
 * delete" with the name locked.
 *
 * Nesting: built on {@link Modal} (base-ui Dialog), which stacks nested dialogs
 * natively, so this works rendered INSIDE another dialog.
 *
 * Async actions: pass `pending` (e.g. a fetcher's in-flight flag) and Confirm
 * shows a spinner; closing is left to the caller (navigation / parent dialog
 * closes on success; on failure it stays open to retry). Omit `pending` and
 * `onConfirm` is awaited instead, auto-closing on resolve.
 */
export function ConfirmDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  requireText,
  requireTextLabel,
  confirmStep,
  pending,
  onConfirm,
}: {
  cancelLabel?: string;
  confirmLabel: string;
  /** Double-confirm: stage the dialog into two steps. `title`/`description` are
   * the first (summary) screen; these are the second (final) screen. */
  confirmStep?: {
    /** Label for the step-1 advance button (default "Continue"). */
    continueLabel?: string;
    description?: React.ReactNode;
    title?: React.ReactNode;
  };
  description?: React.ReactNode;
  /** Style the confirm button as destructive. */
  destructive?: boolean;
  onConfirm: () => void | Promise<unknown>;
  onOpenChange?: (open: boolean) => void;
  /** Controlled open state (optional). */
  open?: boolean;
  /** Caller-driven pending flag (e.g. `fetcher.state !== "idle"`). When present,
   * closing is the caller's responsibility (navigation / parent dialog). */
  pending?: boolean;
  /** Type-to-confirm: Confirm is disabled until the user types this exact
   * string. Shown on the final step. */
  requireText?: string;
  requireTextLabel?: React.ReactNode;
  title: React.ReactNode;
  /** Element that opens the dialog (uncontrolled). */
  trigger?: React.ReactElement;
}) {
  const { t } = useTranslation();
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isOpen = open ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const [text, setText] = React.useState("");
  const [awaiting, setAwaiting] = React.useState(false);
  // Staged double-confirm: step 0 = summary, step 1 = final.
  const staged = confirmStep != null;
  const [step, setStep] = React.useState(0);
  const onFinalStep = !staged || step === 1;
  const inputId = React.useId();

  const externalPending = pending !== undefined;
  const isPending = externalPending ? pending : awaiting;
  const matches = requireText ? text.trim() === requireText.trim() : true;
  const canConfirm = matches && !isPending;
  // The type-to-confirm input locks on the final step (a read-only reminder).
  const lockInput = staged && step === 1;

  // Reset the input + step each time the dialog opens.
  React.useEffect(() => {
    if (isOpen) {
      setText("");
      setStep(0);
    }
  }, [isOpen]);

  async function handleConfirm() {
    if (!canConfirm) return;
    if (externalPending) {
      // Caller drives pending + closing (navigation / parent dialog).
      onConfirm();
      return;
    }
    try {
      setAwaiting(true);
      await onConfirm();
      setOpen(false);
    } finally {
      setAwaiting(false);
    }
  }

  // The final step can override the header copy (e.g. "This can't be undone").
  const headTitle = onFinalStep && staged ? (confirmStep.title ?? title) : title;
  const headDescription =
    onFinalStep && staged ? (confirmStep.description ?? description) : description;

  return (
    <Modal open={isOpen} onOpenChange={setOpen}>
      {trigger ? <ModalTrigger render={trigger} /> : null}
      <ModalContent
        layout="framed"
        data-slot="confirm-dialog"
        className="max-w-md"
      >
        <ModalHeader>
          <ModalTitle>{headTitle}</ModalTitle>
          {headDescription ? (
            <ModalDescription>{headDescription}</ModalDescription>
          ) : null}
        </ModalHeader>

        {requireText ? (
          <ModalBody>
            <Field>
              <FieldLabel htmlFor={inputId}>
                {requireTextLabel ??
                  t("confirm.typeToConfirm", { text: requireText })}
              </FieldLabel>
              {/* Type-to-confirm gates the advance on step 1; on the final step
                  it's locked, re-shown disabled as a reminder. */}
              <Input
                id={inputId}
                value={text}
                onChange={(event) => setText(event.target.value)}
                disabled={lockInput}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder={requireText}
              />
            </Field>
          </ModalBody>
        ) : null}

        <ModalFooter>
          {/* The secondary action is always Cancel (closes the dialog) — even on
              the final step of a staged confirm, we don't offer "Back". */}
          <ModalClose render={<Button type="button" variant="ghost" />}>
            {cancelLabel ?? t("common.cancel")}
          </ModalClose>

          {onFinalStep ? (
            <Button
              type="button"
              variant={destructive ? "destructive" : "default"}
              disabled={!canConfirm}
              onClick={handleConfirm}
            >
              {isPending ? <Spinner /> : null}
              {confirmLabel}
            </Button>
          ) : (
            <Button
              type="button"
              variant={destructive ? "destructive" : "default"}
              disabled={!matches}
              onClick={() => setStep(1)}
            >
              {confirmStep.continueLabel ?? t("common.continue")}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

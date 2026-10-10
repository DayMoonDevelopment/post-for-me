import type * as React from "react";

import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalTitle,
} from "~/components/modal";
import { cn } from "~/lib/utils";

/**
 * The public props every action's `<XDialog>` accepts: controlled
 * (`open` + `onOpenChange`) for programmatic opens, OR uncontrolled with a
 * `trigger` for the contextual case. Shared so each action family doesn't
 * redeclare it.
 */
export type SetupActionDialogProps = {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  /** A trigger element for the contextual, uncontrolled case. Omit when opening
   * programmatically. */
  trigger?: React.ReactNode;
};

/**
 * The standard chrome for a single setup action shown on its own: a framed
 * {@link Modal} whose body is one action {@link SetupScreen} and whose footer
 * holds that action's primary control. Each action family composes this into its
 * own `<XDialog>` so the modal is self-contained and reusable ANYWHERE — a
 * checklist "Get started", a contextual button on another page, etc. The
 * launchpad guided-tour does NOT use this; it consumes the action's Content
 * directly and supplies its own carousel frame.
 *
 * Controlled (`open` + `onOpenChange`) for programmatic opens; or pass a
 * `trigger` and leave `open` undefined to let it self-manage (uncontrolled),
 * which is the contextual-trigger case.
 *
 * The fixed-height body matches the onboarding modal so steps don't resize the
 * dialog between renders.
 */
export function SetupActionDialog({
  open,
  onOpenChange,
  defaultOpen,
  trigger,
  title,
  footer,
  className,
  children,
}: {
  /** The action's display-neutral Content (a {@link SetupScreen}). */
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  /** The primary action control(s) for this step. */
  footer?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  /** Accessible dialog title (the screen renders its own visible heading, so
   * this is screen-reader-only). */
  title: string;
  /** A `<ModalTrigger>` (or element rendered through one) for the uncontrolled,
   * contextual case. Omit when opening programmatically. */
  trigger?: React.ReactNode;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} defaultOpen={defaultOpen}>
      {trigger}
      <ModalContent
        layout="framed"
        data-slot="setup-action-dialog"
        className={cn("max-w-xl", className)}
      >
        <ModalTitle className="sr-only">{title}</ModalTitle>
        <div className="flex h-[clamp(22rem,66vh,30rem)] min-h-0 flex-col px-6 pt-6">
          {children}
        </div>
        {footer ? <ModalFooter>{footer}</ModalFooter> : null}
      </ModalContent>
    </Modal>
  );
}

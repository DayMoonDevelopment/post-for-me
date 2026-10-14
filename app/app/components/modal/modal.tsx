import * as React from "react";

import { cn } from "~/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "~/ui/dialog";

/**
 * `Modal` is the app's composable modal-layout system — a namespaced compound
 * family that sits ON TOP of the shadcn `Dialog` primitive (`~/ui/dialog`),
 * which it consumes internally and never replaces. Where `Dialog` is the raw
 * popup, `Modal` adds the cohesive *layout* every dialog in the app should share:
 * a pinned header, a single scrolling body, an optional muted-aside second
 * column, a slidable carousel ({@link ./modal-carousel}), replace-style inner
 * navigation ({@link ./modal-views}), and a pinned footer — all combinable.
 *
 * The parts are assembled by the consumer (see the showcase + `BillingPlansDialog`).
 * `ModalContent layout="framed"` makes the popup a bounded flex column so the
 * header/footer pin and the body owns the only scroll; `layout="simple"` keeps
 * the plain `Dialog` box. The layout rides {@link ModalLayoutContext} so the
 * header/footer self-pad only when framed.
 */
type ModalLayout = "simple" | "framed";

const ModalLayoutContext = React.createContext<ModalLayout>("framed");

function useModalLayout() {
  return React.useContext(ModalLayoutContext);
}

// Root + trigger + close + a11y title/description are the Dialog primitives,
// re-exported under the Modal namespace so a consumer assembles one family.
const Modal = Dialog;
const ModalTrigger = DialogTrigger;
const ModalClose = DialogClose;
const ModalTitle = DialogTitle;
const ModalDescription = DialogDescription;

function ModalContent({
  layout = "framed",
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent> & { layout?: ModalLayout }) {
  return (
    <ModalLayoutContext.Provider value={layout}>
      <DialogContent
        data-slot="modal-content"
        className={cn(
          // Framed: a bounded flex column (overrides DialogContent's `grid`), so
          // a `flex-1` body is capped to the modal and scrolls INTERNALLY while
          // the footer pins — without it a tall body overflows past `max-h`.
          // `overflow-hidden` makes the body the single scroll region;
          // `p-0`/`gap-0` hand padding to the parts.
          layout === "framed" &&
            "flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0",
          className,
        )}
        {...props}
      >
        {children}
      </DialogContent>
    </ModalLayoutContext.Provider>
  );
}

function ModalHeader({ className, ...props }: React.ComponentProps<"div">) {
  const layout = useModalLayout();
  return (
    <div
      data-slot="modal-header"
      className={cn(
        "flex flex-col gap-1.5 text-center sm:text-start",
        // Framed: a pinned, solid bar (its own bg so a muted aside / scrolling
        // body never bleeds through). `pe-12` clears the absolute close button.
        layout === "framed" && "shrink-0 bg-popover px-6 pt-6 pb-4 sm:pe-12",
        className,
      )}
      {...props}
    />
  );
}

function ModalBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-body"
      className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-4", className)}
      {...props}
    />
  );
}

/**
 * The body split into two columns: a primary {@link ModalColumn} and a
 * distinguished {@link ModalAside} (muted panel). Container-query responsive —
 * side-by-side when the modal is wide, stacked when narrow.
 *
 * Flex (not grid) so the columns stay bounded to the available height and scroll
 * INTERNALLY (a grid auto-row would size to the taller column and overflow the
 * footer). The whole chain uses `flex-1 min-h-0` rather than `h-full` so the
 * height is definite via flexbox (a percentage `h-full` wouldn't resolve against
 * a flex-grown parent, leaving the columns unbounded → no scroll).
 * `items-stretch` makes both columns full-height, so the aside's panel
 * background fills the whole side regardless of which column is taller.
 */
function ModalColumns({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-columns"
      className={cn("@container flex min-h-0 flex-1 flex-col", className)}
      {...props}
    >
      <div className="flex min-h-0 flex-1 flex-col @2xl:flex-row">
        {children}
      </div>
    </div>
  );
}

function ModalColumn({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-column"
      className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-4", className)}
      {...props}
    />
  );
}

function ModalAside({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-aside"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto border-t border-border bg-muted/50 px-6 py-4",
        // Side border instead of top border once the columns sit side-by-side.
        "@2xl:border-s @2xl:border-t-0",
        className,
      )}
      {...props}
    />
  );
}

function ModalFooter({ className, ...props }: React.ComponentProps<"div">) {
  const layout = useModalLayout();
  return (
    <div
      data-slot="modal-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        // Framed: a pinned, solid bar — its own bg persists across the full
        // width (over a muted aside) and sits inline below the body.
        layout === "framed" &&
          "shrink-0 border-t border-border bg-popover px-6 py-4",
        className,
      )}
      {...props}
    />
  );
}

export {
  Modal,
  ModalAside,
  ModalBody,
  ModalClose,
  ModalColumn,
  ModalColumns,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  type ModalLayout,
  ModalTitle,
  ModalTrigger,
  useModalLayout,
};

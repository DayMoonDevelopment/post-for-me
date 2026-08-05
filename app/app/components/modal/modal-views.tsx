import * as React from "react";
import { useTranslation } from "react-i18next";

import { ChevronLeftIcon } from "~/icons";
import { cn } from "~/lib/utils";
import { Button } from "~/ui/button";

/**
 * The **replace-style inner navigation** variation of {@link ./modal Modal}: a
 * push/pop view stack that swaps the active view *in place* (a subtle in-place
 * transition, NOT a horizontal track — that's {@link ./modal-carousel
 * ModalCarousel}). Use it when a dialog drills into sub-views and back (a
 * settings panel, a branching wizard).
 *
 * `ModalViews defaultView="…"` owns the stack; each {@link ModalView value="…"}
 * is a destination rendered only when active; {@link useModalViews} drives
 * navigation (`push`/`pop`/`replace`/`reset`); {@link ModalViewsBack} is a back
 * affordance that hides when there's nothing to pop. Orthogonal to the carousel
 * — compose either inside the other.
 */
type ModalViewsDirection = "forward" | "back" | "none";

type ModalViewsContextValue = {
  active: string;
  canGoBack: boolean;
  direction: ModalViewsDirection;
  pop: () => void;
  push: (view: string) => void;
  replace: (view: string) => void;
  reset: (view?: string) => void;
  stack: string[];
};

const ModalViewsContext = React.createContext<ModalViewsContextValue | null>(
  null,
);

function useModalViews() {
  const ctx = React.useContext(ModalViewsContext);
  if (!ctx) {
    throw new Error("useModalViews must be used within <ModalViews>");
  }
  return ctx;
}

function ModalViews({
  defaultView,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { defaultView: string }) {
  const [stack, setStack] = React.useState<string[]>([defaultView]);
  const [direction, setDirection] = React.useState<ModalViewsDirection>("none");
  const active = stack[stack.length - 1];

  const push = React.useCallback((view: string) => {
    setDirection("forward");
    setStack((s) => [...s, view]);
  }, []);
  const pop = React.useCallback(() => {
    setDirection("back");
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);
  const replace = React.useCallback((view: string) => {
    setDirection("forward");
    setStack((s) => [...s.slice(0, -1), view]);
  }, []);
  const reset = React.useCallback(
    (view?: string) => {
      setDirection("back");
      setStack([view ?? defaultView]);
    },
    [defaultView],
  );

  return (
    <ModalViewsContext.Provider
      value={{
        active,
        stack,
        canGoBack: stack.length > 1,
        direction,
        push,
        pop,
        replace,
        reset,
      }}
    >
      <div
        data-slot="modal-views"
        className={cn("relative flex min-h-0 flex-1 flex-col", className)}
        {...props}
      >
        {children}
      </div>
    </ModalViewsContext.Provider>
  );
}

function ModalView({
  value,
  className,
  ...props
}: React.ComponentProps<"div"> & { value: string }) {
  const { active, direction } = useModalViews();
  if (active !== value) return null;
  return (
    // `key` remounts on view change so the enter animation replays; only the
    // active view is mounted (a true replace, not a track). `data-direction`
    // (see app.css) gives push vs pop a slightly different in-place motion.
    <div
      key={value}
      data-slot="modal-view"
      data-direction={direction}
      className={cn("flex min-h-0 flex-1 flex-col", className)}
      {...props}
    />
  );
}

function ModalViewsBack({
  className,
  label,
  ...props
}: React.ComponentProps<typeof Button> & { label?: string }) {
  const { t } = useTranslation();

  const { canGoBack, pop } = useModalViews();
  if (!canGoBack) return null;
  return (
    <Button
      data-slot="modal-views-back"
      variant="ghost"
      size="icon-sm"
      onClick={pop}
      className={className}
      {...props}
    >
      <ChevronLeftIcon className="rtl:rotate-180" />
      <span className="sr-only">{label ?? t("common.back")}</span>
    </Button>
  );
}

/**
 * The view stack if there is one, else `null`.
 *
 * For parts that are reused both inside a stack and standalone — a footer
 * button that advances to a sub-view in one dialog and submits in another —
 * where {@link useModalViews}'s throw would be wrong rather than helpful.
 */
function useOptionalModalViews(): ModalViewsContextValue | null {
  return React.useContext(ModalViewsContext);
}

export {
  ModalView,
  ModalViews,
  ModalViewsBack,
  useModalViews,
  useOptionalModalViews,
};

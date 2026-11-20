import type { ComponentProps, ReactElement, ReactNode } from "react";

import {
  AnimatePresence,
  motion,
  type Transition,
  useReducedMotion,
} from "motion/react";
import { Children, createContext, isValidElement, useContext } from "react";

import { cn } from "~/lib/utils";

/**
 * The lifecycle of an async action. `Status` animates between these — busy and
 * done zoom in/out — so a button or inline indicator can move
 * idle → busy → done (and back) without a hard cut.
 */
export type StatusState = "idle" | "busy" | "done";

const StatusContext = createContext<StatusState | null>(null);

/** Read the active status from inside a `<Status>` subtree. */
export function useStatus(): StatusState {
  const value = useContext(StatusContext);
  if (value === null) {
    throw new Error("useStatus must be used within <Status>.");
  }
  return value;
}

type StatusPanelProps = {
  children: ReactNode;
  /** The status this panel renders for. */
  value: StatusState;
};

/**
 * A declarative slot for one status. Renders nothing itself — `<Status>` reads
 * these and zooms the active one in (and the previous one out). Omit a panel
 * (e.g. `idle`) to show nothing for that status.
 */
export function StatusPanel(_props: StatusPanelProps): null {
  return null;
}

const SHOWN = { opacity: 1, scale: 1 };
const ZOOMED = { opacity: 0, scale: 0.8 };

// Fast cross-fade: enter and exit overlap (no `mode="wait"`) and both fade
// while scaling. Short tween so state changes feel snappy.
const DEFAULT_TRANSITION: Transition = {
  duration: 0.16,
  ease: "easeOut",
};

/**
 * Container that swaps its content based on `value`. The outgoing and incoming
 * `<StatusPanel>`s cross-fade while scaling (a quick zoom cross-dissolve), and
 * the box animates its size to fit the active panel — so differently-sized
 * states resize smoothly instead of jumping or reserving the largest footprint.
 * Honors reduced-motion (fades only, no scale or size animation).
 *
 * Composes with — but is independent of — `<Spinner>`: drop a `<Spinner />`
 * inside the busy panel.
 */
export function Status({
  value,
  transition,
  className,
  children,
  ...props
}: {
  transition?: Transition;
  value: StatusState;
} & ComponentProps<"span">) {
  const reduce = useReducedMotion();

  const panels = Children.toArray(children).filter(
    (child): child is ReactElement<StatusPanelProps> =>
      isValidElement(child) && child.type === StatusPanel,
  );
  const active = panels.find((panel) => panel.props.value === value);

  return (
    <StatusContext.Provider value={value}>
      <span className={cn("inline-flex", className)} {...props}>
        {/* The inner box animates its size (layout) to fit the active panel, so
            states with different widths resize smoothly instead of jumping. */}
        <motion.span
          layout={!reduce}
          transition={transition ?? DEFAULT_TRANSITION}
          className="relative inline-flex items-center justify-center"
        >
          {/* popLayout pops the outgoing panel out of flow so it doesn't bloat
              the box mid-transition; the two cross-fade as the box resizes. */}
          <AnimatePresence mode="popLayout" initial={false}>
            {active ? (
              <motion.span
                key={value}
                className="inline-flex items-center justify-center gap-2"
                initial={reduce ? { opacity: 0 } : ZOOMED}
                animate={reduce ? { opacity: 1 } : SHOWN}
                exit={reduce ? { opacity: 0 } : ZOOMED}
                transition={transition ?? DEFAULT_TRANSITION}
              >
                {active.props.children}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </motion.span>
      </span>
    </StatusContext.Provider>
  );
}

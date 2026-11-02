import * as React from "react";

import { CheckIcon } from "~/icons";
import { cn } from "~/lib/utils";

/**
 * Steps — a vertical, status-driven step rail: an ordered run of items threaded
 * by a connecting line, each fronted by a status indicator (done / current /
 * upcoming). It's a presentation primitive for "here's the sequence, here's
 * where you are" — the dashboard launchpad checklist is the canonical consumer,
 * but it's content-agnostic. Compose the parts:
 *
 *   <Steps>
 *     <Step status="complete">
 *       <StepContent>…done row…</StepContent>
 *     </Step>
 *     <Step status="current">
 *       <StepContent>…active row…</StepContent>
 *     </Step>
 *   </Steps>
 *
 * `Step` owns the rail (indicator + connector) and rides its `status` on a
 * context so {@link StepIndicator} can render the right glyph. The connector
 * that joins one step to the next is dropped automatically on the last `Step` —
 * `Steps` injects `last`, so consumers never compute "is this the final row?"
 * themselves.
 *
 * The primitive is visually unopinionated about reachability: pass `disabled`
 * to a `Step` to mark it (it reflects `data-disabled` / `aria-disabled`), but
 * what that LOOKS like — dimming, muting, locking the action — is the consumer's
 * call, since the consumer holds the state that decides it.
 *
 * This is a status DISPLAY, not a wizard: it renders no next/back controls and
 * holds no navigation state. Reach for the modal carousel when you need
 * click-through.
 */
export type StepStatus = "complete" | "current" | "upcoming";

/**
 * How "traversed" the connector below a step is, derived from its own and the
 * next step's status: `complete` when both are done (solid primary), `active`
 * for the leading edge — a done step into a not-yet-done one (dashed primary) —
 * and `muted` otherwise (faint). {@link connectorTone} computes it.
 */
export type StepConnectorTone = "muted" | "active" | "complete";

function connectorTone(
  status: StepStatus,
  nextStatus: StepStatus | undefined,
): StepConnectorTone {
  if (status !== "complete") return "muted";
  return nextStatus === "complete" ? "complete" : "active";
}

const StepStatusContext = React.createContext<StepStatus | null>(null);

function Steps({ className, children, ...props }: React.ComponentProps<"div">) {
  // Each Step's rail depends on its neighbours: whether it's the last step (drop
  // the connector) and what the next step's status is (how far to highlight the
  // connector). The consumer shouldn't have to thread that — we derive it here
  // from the ordered Step children. Explicit props on a Step still win.
  const items = React.Children.toArray(children);
  const stepIndices = items.flatMap((child, index) =>
    React.isValidElement(child) && child.type === Step ? [index] : [],
  );

  return (
    <div
      data-slot="steps"
      // `gap-6` is the inter-step spacing AND the distance the connector is
      // tuned to bridge — see {@link StepConnector}. Keep them in sync.
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      {items.map((child, index) => {
        if (!React.isValidElement<StepProps>(child) || child.type !== Step) {
          return child;
        }
        const pos = stepIndices.indexOf(index);
        const isLast = pos === stepIndices.length - 1;
        const nextStep = items[stepIndices[pos + 1]] as
          | React.ReactElement<StepProps>
          | undefined;
        return React.cloneElement(child, {
          last: child.props.last ?? isLast,
          connectorTone:
            child.props.connectorTone ??
            connectorTone(child.props.status, nextStep?.props.status),
        });
      })}
    </div>
  );
}

type StepProps = React.ComponentProps<"div"> & {
  /** How far to highlight the connector below this step. Injected by
   * {@link Steps} from this step + the next step's status; override per-step if
   * rendering outside `Steps`. */
  connectorTone?: StepConnectorTone;
  /** Marks the step as not reachable/interactive. Reflected as `data-disabled`
   * and `aria-disabled`; the primitive applies no styling of its own — the
   * consumer decides what disabled looks like. */
  disabled?: boolean;
  /** Drops the trailing connector. Injected by {@link Steps} for the last step;
   * only set this by hand when rendering a `Step` outside `Steps`. */
  last?: boolean;
  status: StepStatus;
};

function Step({
  status,
  disabled = false,
  last = false,
  connectorTone = "muted",
  className,
  children,
  ...props
}: StepProps) {
  return (
    <StepStatusContext.Provider value={status}>
      <div
        data-slot="step"
        data-status={status}
        data-disabled={disabled ? "" : undefined}
        aria-disabled={disabled || undefined}
        className={cn("flex gap-4", className)}
        {...props}
      >
        {/* The rail: the status indicator, centered against the row's content,
            with the line that ties this step to the next dropping out beneath it
            — so the run reads as one guided path. The rail stretches to the
            content's height (default flex `stretch`) and centers the indicator
            within it, so the indicator lines up with the row no matter how tall
            the content is. */}
        <div
          data-slot="step-rail"
          className="relative flex w-6 shrink-0 items-center justify-center"
        >
          <StepIndicator className="relative z-10" />
          {!last ? <StepConnector tone={connectorTone} /> : null}
        </div>
        {children}
      </div>
    </StepStatusContext.Provider>
  );
}

/**
 * The status glyph at the head of a step's rail: a filled primary disc with a
 * check when complete, a soft ringed dot when current, and a fainter ringed dot
 * when upcoming. The footprint stays `size-6` across all states so
 * the rail's alignment and connector geometry don't shift. Reads its status from
 * the enclosing {@link Step}; pass `status` to use it standalone. Override the
 * complete-state glyph by passing children.
 */
function StepIndicator({
  status: statusProp,
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & { status?: StepStatus }) {
  const contextStatus = React.useContext(StepStatusContext);
  const status = statusProp ?? contextStatus ?? "upcoming";

  if (status === "complete") {
    return (
      <span
        data-slot="step-indicator"
        data-status={status}
        className={cn(
          "flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground [&_svg]:size-4",
          className,
        )}
        {...props}
      >
        {children ?? <CheckIcon />}
      </span>
    );
  }

  return (
    <span
      data-slot="step-indicator"
      data-status={status}
      // `current` reads as active: a full-strength primary ring over a faint
      // tint, with a solid dot. `upcoming` is a thin, low-opacity border that
      // fades into the muted color.
      className={cn(
        "flex size-6 items-center justify-center rounded-full",
        status === "current"
          ? "border-2 border-primary bg-primary/5"
          : "border border-border/70",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          status === "current" ? "bg-primary" : "bg-border",
        )}
      />
    </span>
  );
}

// The leading-edge `active` segment is a dashed primary line (a zero-width box
// with a dashed left border); the solid tones are a 1px filled bar. Width lives
// here per-tone so the dashed and solid styles stay the same visual weight.
const CONNECTOR_TONE: Record<StepConnectorTone, string> = {
  muted: "w-px bg-border/50",
  active: "w-0 border-l border-dashed border-primary",
  complete: "w-px bg-primary",
};

/**
 * The line joining one step to the next. Absolutely positioned within the rail:
 * it starts just below this step's centered indicator (`50%` + half the 1.5rem
 * indicator) and runs `h-full` (the content's height) so its end lands just
 * above the next step's centered indicator — given the 1.5rem (`gap-6`) spacing
 * {@link Steps} sets between steps. Change that gap and this length must change
 * with it. Rendered by {@link Step} for every step but the last; its `tone`
 * highlights how far progress has reached.
 */
function StepConnector({
  tone = "muted",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: StepConnectorTone }) {
  return (
    <span
      data-slot="step-connector"
      data-tone={tone}
      className={cn(
        "absolute left-1/2 top-[calc(50%+0.75rem)] h-full -translate-x-1/2",
        CONNECTOR_TONE[tone],
        className,
      )}
      {...props}
    />
  );
}

/**
 * The body of a step, set beside the rail. Its height drives the rail: the
 * indicator centers against it and the connector spans it. Put the consumer's
 * own layout — icon, title, description, action — inside, and apply any
 * disabled/dimmed treatment there too (the primitive stays neutral).
 */
function StepContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="step-content"
      className={cn("flex flex-1 flex-col", className)}
      {...props}
    />
  );
}

export { Step, StepConnector, StepContent, StepIndicator, Steps };

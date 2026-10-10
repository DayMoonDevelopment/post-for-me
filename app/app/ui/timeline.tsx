import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { createContext, useCallback, useContext, useState } from "react"

import { cn } from "~/lib/utils"

// Types
type TimelineContextValue = {
  activeStep: number
  setActiveStep: (step: number) => void
}

// Context
const TimelineContext = createContext<TimelineContextValue | undefined>(
  undefined
)

const useTimeline = () => {
  const context = useContext(TimelineContext)
  if (!context) {
    throw new Error("useTimeline must be used within a Timeline")
  }
  return context
}

// Components
interface TimelineProps extends useRender.ComponentProps<"div"> {
  defaultValue?: number
  onValueChange?: (value: number) => void
  orientation?: "horizontal" | "vertical"
  value?: number
}

function Timeline({
  defaultValue = 1,
  value,
  onValueChange,
  orientation = "vertical",
  className,
  render,
  children,
  ...props
}: TimelineProps) {
  const [activeStep, setInternalStep] = useState(defaultValue)

  const setActiveStep = useCallback(
    (step: number) => {
      if (value === undefined) {
        setInternalStep(step)
      }
      onValueChange?.(step)
    },
    [value, onValueChange]
  )

  const currentStep = value ?? activeStep

  const defaultProps = {
    className: cn(
      "group/timeline flex data-[orientation=horizontal]:w-full data-[orientation=horizontal]:flex-row data-[orientation=vertical]:flex-col",
      className
    ),
    "data-orientation": orientation,
    "data-slot": "timeline",
    children,
  }

  return (
    <TimelineContext.Provider
      value={{ activeStep: currentStep, setActiveStep }}
    >
      {useRender({
        defaultTagName: "div",
        render,
        props: mergeProps<"div">(defaultProps, props),
      })}
    </TimelineContext.Provider>
  )
}

// TimelineContent
function TimelineContent({
  className,
  render,
  children,
  ...props
}: useRender.ComponentProps<"div">) {
  const defaultProps = {
    className: cn("text-muted-foreground text-sm", className),
    "data-slot": "timeline-content",
    children,
  }

  return useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(defaultProps, props),
  })
}

// TimelineDate
type TimelineDateProps = useRender.ComponentProps<"time">

function TimelineDate({
  className,
  render,
  children,
  ...props
}: TimelineDateProps) {
  const defaultProps = {
    className: cn(
      "mb-1 block font-medium text-muted-foreground text-xs group-data-[orientation=vertical]/timeline:max-sm:h-4",
      className
    ),
    "data-slot": "timeline-date",
    children,
  }

  return useRender({
    defaultTagName: "time",
    render,
    props: mergeProps<"time">(defaultProps, props),
  })
}

// TimelineHeader
function TimelineHeader({
  className,
  render,
  children,
  ...props
}: useRender.ComponentProps<"div">) {
  const defaultProps = {
    className: cn(className),
    "data-slot": "timeline-header",
    children,
  }

  return useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(defaultProps, props),
  })
}

// TimelineIndicator
type TimelineIndicatorProps = useRender.ComponentProps<"div">

function TimelineIndicator({
  className,
  children,
  render,
  ...props
}: TimelineIndicatorProps) {
  const defaultProps = {
    "aria-hidden": true,
    // DASHBOARD SKIN (re-apply after a ReUI merge): upstream sizes the indicator
    // `size-4`; our status discs are `size-6` (see `~/ui/steps` StepIndicator), so
    // the item gutter and separator offsets below are retuned to match. Callers
    // own the fill/glyph via `className` + children; the ring here is the neutral
    // structural default.
    className: cn(
      "group-data-[orientation=horizontal]/timeline:-top-6 group-data-[orientation=horizontal]/timeline:-translate-y-1/2 group-data-[orientation=vertical]/timeline:-left-6 group-data-[orientation=vertical]/timeline:-translate-x-1/2 absolute size-6 rounded-full border-2 border-primary/20 group-data-[orientation=vertical]/timeline:top-0 group-data-[orientation=horizontal]/timeline:left-0 group-data-completed/timeline-item:border-primary",
      className
    ),
    "data-slot": "timeline-indicator",
    children,
  }

  return useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(defaultProps, props),
  })
}

// TimelineItem
interface TimelineItemProps extends useRender.ComponentProps<"div"> {
  step: number
}

function TimelineItem({
  step,
  className,
  render,
  children,
  ...props
}: TimelineItemProps) {
  const { activeStep } = useTimeline()

  const defaultProps = {
    // DASHBOARD SKIN (re-apply after a ReUI merge): gutter widened `ms-8`→`ms-10`
    // / `mt-8`→`mt-10` for our `size-6` indicator. Upstream's
    // `has-[+[data-completed]]:…timeline-separator:bg-primary` (status-tinted
    // connector) is dropped: our connector is neutral and status-independent — the
    // separator's own `bg-border` below is the single source of truth.
    className: cn(
      "group/timeline-item relative flex flex-1 flex-col gap-0.5 group-data-[orientation=vertical]/timeline:ms-10 group-data-[orientation=horizontal]/timeline:mt-10 group-data-[orientation=horizontal]/timeline:not-last:pe-8 group-data-[orientation=vertical]/timeline:not-last:pb-6",
      className
    ),
    "data-completed": step <= activeStep || undefined,
    "data-slot": "timeline-item",
    children,
  }

  return useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(defaultProps, props),
  })
}

// TimelineSeparator
function TimelineSeparator({
  className,
  render,
  children,
  ...props
}: useRender.ComponentProps<"div">) {
  const defaultProps = {
    "aria-hidden": true,
    // DASHBOARD SKIN (re-apply after a ReUI merge): two divergences.
    // 1. Colour: upstream `bg-primary/10` → `bg-border`. Our timeline connector is
    //    a neutral rail, not a status-progress bar (LogRail has no status).
    // 2. Offsets retuned for the `size-6` indicator: the start offset
    //    `translate-*-4.5`→`-7` (1.125rem→1.75rem) and the length subtrahend
    //    `1rem`→`1.5rem` both track the indicator's height so the line starts just
    //    below the disc and ends just above the next one.
    className: cn(
      "group-data-[orientation=horizontal]/timeline:-top-6 group-data-[orientation=horizontal]/timeline:-translate-y-1/2 group-data-[orientation=vertical]/timeline:-left-6 group-data-[orientation=vertical]/timeline:-translate-x-1/2 absolute self-start bg-border group-last/timeline-item:hidden group-data-[orientation=horizontal]/timeline:h-0.5 group-data-[orientation=vertical]/timeline:h-[calc(100%-1.5rem-0.25rem)] group-data-[orientation=horizontal]/timeline:w-[calc(100%-1.5rem-0.25rem)] group-data-[orientation=vertical]/timeline:w-0.5 group-data-[orientation=horizontal]/timeline:translate-x-7 group-data-[orientation=vertical]/timeline:translate-y-7",
      className
    ),
    "data-slot": "timeline-separator",
    children,
  }

  return useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(defaultProps, props),
  })
}

// TimelineTitle
function TimelineTitle({
  className,
  render,
  children,
  ...props
}: useRender.ComponentProps<"h3">) {
  const defaultProps = {
    className: cn("font-medium text-sm", className),
    "data-slot": "timeline-title",
    children,
  }

  return useRender({
    defaultTagName: "h3",
    render,
    props: mergeProps<"h3">(defaultProps, props),
  })
}

export {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
}
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import * as React from "react";

import { CheckSmallIcon } from "~/icons";
import { cn } from "~/lib/utils";

// A card-styled selection group: the management of a Toggle Group with the
// composable anatomy of a Card. Single- or multi-select via `multiple`; the
// item indicator renders as a radio (single) or a checkbox (multiple).
//
// `orientation` sets how each item lays out its slots:
//   - "horizontal" (default): icon | content | indicator, in a row.
//   - "vertical": a card — icon over content, with the indicator pinned to the
//     top-end corner. Pair with a grid on the root (e.g. `grid grid-cols-2`).
// This is OUR styling axis; it's deliberately not forwarded to base-ui's
// ToggleGroup (which has its own `orientation` for keyboard nav), so nav
// behaviour is unchanged.
//
// Anatomy (compound — see the `compound-components` skill):
//   <Choicebox value onValueChange multiple orientation>
//     <ChoiceboxItem value>
//       <ChoiceboxItemIcon><Icon /></ChoiceboxItemIcon>
//       <ChoiceboxItemContent>
//         <ChoiceboxItemTitle>…</ChoiceboxItemTitle>
//         <ChoiceboxItemDescription>…</ChoiceboxItemDescription>
//       </ChoiceboxItemContent>
//       <ChoiceboxItemIndicator />
//     </ChoiceboxItem>
//   </Choicebox>
//
// `value` is always an array (base-ui ToggleGroup semantics): single-select is
// simply a group whose value holds at most one entry.

type ChoiceboxOrientation = "horizontal" | "vertical";

type ChoiceboxContextValue = {
  multiple: boolean;
  orientation: ChoiceboxOrientation;
};

const ChoiceboxContext = React.createContext<ChoiceboxContextValue | null>(
  null,
);

function useChoicebox() {
  const context = React.useContext(ChoiceboxContext);
  if (!context) {
    throw new Error("Choicebox parts must be used within <Choicebox>");
  }
  return context;
}

function Choicebox({
  multiple = false,
  orientation = "horizontal",
  className,
  ...props
}: ToggleGroup.Props & { orientation?: ChoiceboxOrientation }) {
  return (
    <ChoiceboxContext.Provider value={{ multiple, orientation }}>
      <ToggleGroup
        multiple={multiple}
        data-slot="choicebox"
        className={cn("flex flex-col gap-3", className)}
        {...props}
      />
    </ChoiceboxContext.Provider>
  );
}

function ChoiceboxItem({ className, ...props }: Toggle.Props) {
  const { orientation } = useChoicebox();
  return (
    <Toggle
      data-slot="choicebox-item"
      data-orientation={orientation}
      className={cn(
        "group/choicebox-item flex gap-4 rounded-lg border border-border p-4 text-start transition-colors",
        "hover:border-primary/50 hover:bg-accent",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30",
        "data-pressed:border-primary data-pressed:bg-accent",
        orientation === "vertical"
          ? "relative flex-col items-start gap-3"
          : "items-center",
        className,
      )}
      {...props}
    />
  );
}

function ChoiceboxItemIcon({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="choicebox-item-icon"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors [&_svg]:size-5",
        "group-data-pressed/choicebox-item:bg-primary/10 group-data-pressed/choicebox-item:text-primary",
        className,
      )}
      {...props}
    />
  );
}

function ChoiceboxItemContent({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="choicebox-item-content"
      className={cn("flex flex-1 flex-col gap-0.5", className)}
      {...props}
    />
  );
}

function ChoiceboxItemTitle({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="choicebox-item-title"
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}

function ChoiceboxItemDescription({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="choicebox-item-description"
      className={cn("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

function ChoiceboxItemIndicator({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const { multiple, orientation } = useChoicebox();
  return (
    <span
      data-slot="choicebox-item-indicator"
      aria-hidden
      className={cn(
        "flex size-5 shrink-0 items-center justify-center border border-muted-foreground/30 text-transparent transition-colors",
        multiple ? "rounded-[0.4rem]" : "rounded-full",
        "group-data-pressed/choicebox-item:border-primary group-data-pressed/choicebox-item:bg-primary group-data-pressed/choicebox-item:text-primary-foreground",
        // In a card, the indicator floats in the top-end corner instead of
        // sitting inline at the end of the row.
        orientation === "vertical" && "absolute inset-e-3 top-3",
        className,
      )}
      {...props}
    >
      <CheckSmallIcon className="size-3.5" />
    </span>
  );
}

export {
  Choicebox,
  ChoiceboxItem,
  ChoiceboxItemContent,
  ChoiceboxItemDescription,
  ChoiceboxItemIcon,
  ChoiceboxItemIndicator,
  ChoiceboxItemTitle,
  useChoicebox,
};

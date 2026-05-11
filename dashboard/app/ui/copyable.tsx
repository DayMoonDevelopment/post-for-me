import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { CheckmarkSmallIcon, CopyIcon } from "~/components/icons";

import { cn } from "~/lib/utils";

import { Tooltip, TooltipContent, TooltipTrigger } from "~/ui/tooltip";

interface CopyableContextValue {
  value: string;
  copied: boolean;
  handleCopy: () => void;
}

const CopyableContext = React.createContext<CopyableContextValue | null>(null);

function useCopyable() {
  const ctx = React.useContext(CopyableContext);
  if (!ctx) {
    throw new Error("Copyable components must be rendered inside <Copyable>");
  }
  return ctx;
}

interface CopyableProps {
  value: string;
  children: React.ReactNode;
}

function Copyable({ value, children }: CopyableProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  }, [value]);

  const contextValue = React.useMemo<CopyableContextValue>(
    () => ({ value, copied, handleCopy }),
    [value, copied, handleCopy],
  );

  return (
    <CopyableContext.Provider value={contextValue} data-slot="copyable">
      <Tooltip>{children}</Tooltip>
    </CopyableContext.Provider>
  );
}

interface CopyableTriggerProps
  extends React.ComponentPropsWithoutRef<"button"> {
  asChild?: boolean;
}

function CopyableTrigger({
  asChild,
  className,
  children,
  ...props
}: CopyableTriggerProps) {
  const { handleCopy, copied } = useCopyable();
  const Comp = asChild ? Slot : "button";

  return (
    <TooltipTrigger asChild>
      <Comp
        type={asChild ? undefined : "button"}
        onClick={handleCopy}
        className={cn(
          "inline-flex items-center gap-2",
          "cursor-pointer w-full min-w-0",
          className,
        )}
        data-slot="copyable-trigger"
        {...props}
      >
        {children}
        <TooltipContent className="text-xs">
          {copied ? "Copied!" : "Click to copy"}
        </TooltipContent>
      </Comp>
    </TooltipTrigger>
  );
}

interface CopyableContentProps extends React.HTMLAttributes<HTMLSpanElement> {
  asChild?: boolean;
}

function CopyableContent({
  asChild,
  className,
  children,
  ...props
}: CopyableContentProps) {
  const { value } = useCopyable();
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      className={cn(
        "text-left rounded px-1.5 py-1 font-mono text-xs text-card-foreground flex-1 min-w-0 truncate border bg-card focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors",
        className,
      )}
      data-slot="copyable-content"
      {...props}
    >
      {children ?? value}
    </Comp>
  );
}

interface CopyableIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  asChild?: boolean;
}

function CopyableIcon({ asChild, className, ...props }: CopyableIconProps) {
  const { copied } = useCopyable();
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      className={cn("flex-shrink-0", className)}
      data-slot="copyable-icon"
      {...props}
    >
      {copied ? (
        <CheckmarkSmallIcon className="size-3 text-affirmative" />
      ) : (
        <CopyIcon className="size-3 text-muted-foreground" />
      )}
    </Comp>
  );
}

export { Copyable, CopyableTrigger, CopyableContent, CopyableIcon };

import { useCallback, useMemo, useState } from "react";
import { CheckmarkSmallIcon, CopyIcon } from "~/components/icons";

import { cn } from "~/lib/utils";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/ui/tooltip";

interface CopyableProps {
  value: string;
  className?: string;
  children?: React.ReactNode;
  showIcon?: boolean;
  truncate?: boolean;
  maxLength?: number;
}

export function Copyable({
  value,
  className,
  children,
  showIcon = true,
  truncate = false,
  maxLength = 50,
}: CopyableProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  }, [value]);

  const displayValue = useMemo(() => {
    if (!truncate || value.length <= maxLength) {
      return value;
    }
    return `${value.substring(0, maxLength)}...`;
  }, [value, truncate, maxLength]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "inline-flex items-center gap-2 text-left hover:bg-muted/50 rounded px-1 py-0.5 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              className,
            )}
          >
            {children || (
              <span className="font-mono text-sm">{displayValue}</span>
            )}
            {showIcon ? (
              <span className="flex-shrink-0">
                {copied ? (
                  <CheckmarkSmallIcon className="size-3 text-affirmative" />
                ) : (
                  <CopyIcon className="size-3 text-muted-foreground" />
                )}
              </span>
            ) : null}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? "Copied!" : "Click to copy"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

import type { ReactNode } from "react";

import { Info } from "lucide-react";

import { cn } from "~/lib/utils";
import { Alert, AlertDescription } from "~/ui/alert";

/** A doc note — the shadcn Alert primitive with an info icon, for showcase callouts. */
export function Callout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Alert className={className}>
      <Info />
      <AlertDescription className="[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-foreground">
        {children}
      </AlertDescription>
    </Alert>
  );
}

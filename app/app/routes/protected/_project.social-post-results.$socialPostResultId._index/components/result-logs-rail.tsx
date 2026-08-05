import { ExchangeIcon } from "~/icons";
import { cn } from "~/lib/utils";
import { StepIndicator } from "~/ui/steps";

import type { LogOperation } from "./result-logs-parse";

import { LogSideBlock } from "./result-logs-side-block";

/**
 * The operations as a vertical rail: an exchange-glyph node per operation (no
 * "completed" check), connected oldest → newest, each holding its request +
 * response.
 */
export function LogRail({ operations }: { operations: LogOperation[] }) {
  return (
    <div className="flex flex-col">
      {operations.map((op, index) => {
        const last = index === operations.length - 1;
        return (
          <div key={`${op.name}-${index}`} className="flex gap-4">
            <div className="flex flex-col items-center">
              <StepIndicator status="complete" className="relative z-10">
                <ExchangeIcon />
              </StepIndicator>
              {!last ? <span className="my-1 w-px flex-1 bg-border" /> : null}
            </div>
            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col gap-3",
                !last && "pb-6",
              )}
            >
              <span className="font-heading text-sm font-semibold text-foreground">
                {op.name}
              </span>
              {op.request ? (
                <LogSideBlock side="request" data={op.request} />
              ) : null}
              {op.response ? (
                <LogSideBlock side="response" data={op.response} />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

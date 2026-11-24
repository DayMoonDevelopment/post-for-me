import { StatusIndicator, type StatusName } from "~/ui/status-indicator";

import { Section } from "./section";

const STATUSES: StatusName[] = [
  "default",
  "success",
  "warning",
  "destructive",
  "info",
];

export function StatusIndicatorDemo() {
  return (
    <div className="space-y-8">
      <Section title="First-party statuses">
        <div className="flex flex-wrap items-center gap-5">
          {STATUSES.map((status) => (
            <span key={status} className="inline-flex items-center gap-2 text-sm">
              <StatusIndicator status={status} />
              {status}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Sizes (via className)">
        <div className="flex items-center gap-4">
          <StatusIndicator status="success" className="size-1.5" />
          <StatusIndicator status="success" className="size-2" />
          <StatusIndicator status="success" className="size-2.5" />
          <StatusIndicator status="success" className="size-3" />
        </div>
      </Section>

      <Section title="One-off color via className override">
        <div className="flex items-center gap-4">
          <StatusIndicator className="size-2.5 bg-primary" />
          <StatusIndicator className="size-2.5 bg-pop" />
        </div>
      </Section>
    </div>
  );
}

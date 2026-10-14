import { StatusIndicator } from "~/ui/status-indicator";

const STATUSES = ["default", "success", "warning", "destructive", "info"] as const;

export function StatusIndicatorPreview() {
  return (
    <div className="flex items-center gap-4">
      {STATUSES.map((status) => (
        <StatusIndicator key={status} status={status} className="size-3" />
      ))}
    </div>
  );
}

export function StatusIndicatorSizes() {
  return (
    <div className="flex items-center gap-4">
      <StatusIndicator status="success" className="size-2" />
      <StatusIndicator status="success" className="size-3" />
      <StatusIndicator status="success" className="size-4" />
      <StatusIndicator status="success" className="size-3 ring-2 ring-background" />
    </div>
  );
}

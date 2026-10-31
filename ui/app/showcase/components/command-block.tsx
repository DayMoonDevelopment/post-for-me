import * as React from "react";

import { Copyable } from "./copyable";
import { HighlightedCode } from "./highlighted-code";

const RUNTIMES = ["npm", "pnpm", "yarn", "bun"] as const;
type Runtime = (typeof RUNTIMES)[number];

/** `args` is everything after the runner, e.g. `shadcn@latest add @post-for-me/user-avatar`. */
function toCommand(runtime: Runtime, args: string): string {
  switch (runtime) {
    case "npm":
      return `npx ${args}`;
    case "pnpm":
      return `pnpm dlx ${args}`;
    case "yarn":
      return `yarn dlx ${args}`;
    case "bun":
      return `bunx ${args}`;
  }
}

/** A CLI command shown across every package-manager runtime, copyable. */
export function CommandBlock({
  args,
  onCopy,
}: {
  args: string;
  onCopy?: (runtime: Runtime) => void;
}) {
  const [runtime, setRuntime] = React.useState<Runtime>("npm");
  const command = toCommand(runtime, args);

  return (
    <div className="rounded-xl overflow-hidden border bg-muted/40">
      <div className="flex items-center gap-1 border-b bg-background/40 px-2 py-1">
        {RUNTIMES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setRuntime(option)}
            data-active={option === runtime}
            className="rounded px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-foreground"
          >
            {option}
          </button>
        ))}
      </div>
      <div className="relative">
        <HighlightedCode
          code={command}
          lang="bash"
          className="overflow-x-auto p-4 pr-12"
        />
        <Copyable
          value={command}
          onCopy={() => onCopy?.(runtime)}
          className="absolute end-2 top-2"
        />
      </div>
    </div>
  );
}

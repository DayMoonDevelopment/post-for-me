import * as React from "react";

import type { StatusState } from "~/ui/status";

import { VerifyStatus } from "~/routes/guest/login._index/components/verify-status";
import { Button } from "~/ui/button";

import { Section } from "./section";

const CYCLE: StatusState[] = ["idle", "busy", "done"];

export function VerifyStatusDemo() {
  const [state, setState] = React.useState<StatusState>("busy");
  const [looping, setLooping] = React.useState(true);

  // Auto-advance idle → busy → done → idle so the zoom transitions play on loop.
  React.useEffect(() => {
    if (!looping) return;
    const id = window.setInterval(() => {
      setState((s) => CYCLE[(CYCLE.indexOf(s) + 1) % CYCLE.length]!);
    }, 1300);
    return () => window.clearInterval(id);
  }, [looping]);

  function set(next: StatusState) {
    setLooping(false);
    setState(next);
  }

  return (
    <div className="space-y-8">
      <Section title="OTP verify indicator (live)">
        <div className="flex min-h-8 items-center rounded-md border border-border px-4 py-3">
          <VerifyStatus status={state} />
        </div>
      </Section>

      <Section title="Set state">
        {CYCLE.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={!looping && state === s ? "default" : "outline"}
            onClick={() => set(s)}
          >
            {s}
          </Button>
        ))}
      </Section>

      <Section title="Auto-cycle">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setLooping((v) => !v)}
        >
          {looping ? "Pause" : "Play"}
        </Button>
      </Section>
    </div>
  );
}

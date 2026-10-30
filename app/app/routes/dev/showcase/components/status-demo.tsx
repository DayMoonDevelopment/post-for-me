import * as React from "react";

import { SuccessIcon } from "~/icons";
import { Button } from "~/ui/button";
import { Spinner } from "~/ui/spinner";
import { Status, StatusPanel, type StatusState } from "~/ui/status";

import { Section } from "./section";

export function StatusDemo() {
  const [state, setState] = React.useState<StatusState>("idle");

  // Run the full idle → busy → done → idle cycle on click.
  function run() {
    setState("busy");
    window.setTimeout(() => setState("done"), 1400);
    window.setTimeout(() => setState("idle"), 2800);
  }

  return (
    <div className="space-y-8">
      <Section title="Button — idle → busy → done">
        <Button disabled={state === "busy"} onClick={run}>
          <Status value={state}>
            <StatusPanel value="idle">Save changes</StatusPanel>
            <StatusPanel value="busy">
              <Spinner />
              Saving…
            </StatusPanel>
            <StatusPanel value="done">
              <SuccessIcon />
              Saved
            </StatusPanel>
          </Status>
        </Button>
      </Section>

      <Section title="Inline busy indicator (Spinner + Status together)">
        <Status value={state}>
          <StatusPanel value="idle">
            <span className="text-sm text-muted-foreground">Idle</span>
          </StatusPanel>
          <StatusPanel value="busy">
            <Spinner />
            <span className="text-sm">Verifying…</span>
          </StatusPanel>
          <StatusPanel value="done">
            <SuccessIcon className="text-primary" />
            <span className="text-sm">Verified</span>
          </StatusPanel>
        </Status>
      </Section>

      <Section title="Set state manually">
        <Button variant="outline" size="sm" onClick={() => setState("idle")}>
          Idle
        </Button>
        <Button variant="outline" size="sm" onClick={() => setState("busy")}>
          Busy
        </Button>
        <Button variant="outline" size="sm" onClick={() => setState("done")}>
          Done
        </Button>
      </Section>
    </div>
  );
}

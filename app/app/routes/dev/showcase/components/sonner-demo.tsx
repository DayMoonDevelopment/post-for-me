import { Button } from "~/ui/button";
import { hideProgress, toast } from "~/ui/sonner";

import { Section } from "./section";

export function SonnerDemo() {
  return (
    <div className="space-y-8">
      <Section title="Variants">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => toast("Saved your changes")}>
            Default
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.success("Project created")}
          >
            Success
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.error("No billing plans configured")}
          >
            Error
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info("Heads up — this is informational")}
          >
            Info
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.warning("Double-check before continuing")}
          >
            Warning
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.loading("Processing…")}
          >
            Loading
          </Button>
        </div>
      </Section>

      <Section title="With description + action">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() =>
              toast.error("Couldn't start checkout", {
                description: "No billing plans are configured in Stripe yet.",
              })
            }
          >
            With description
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast("Account disconnected", {
                action: { label: "Undo", onClick: () => toast("Reconnected") },
              })
            }
          >
            With action
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.success("Saved", hideProgress())}
          >
            No progress bar
          </Button>
        </div>
      </Section>
    </div>
  );
}

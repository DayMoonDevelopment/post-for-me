import { InfoIcon, SuccessIcon, WarningIcon } from "~/icons";
import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";

import { Section } from "./section";

export function AlertDemo() {
  return (
    <div className="space-y-8">
      <Section title="Title + description, with icon">
        <Alert variant="info" className="max-w-md">
          <InfoIcon />
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>
            An icon is any direct SVG child — the grid adds a column for it
            automatically.
          </AlertDescription>
        </Alert>
      </Section>

      <Section title="Variants">
        <div className="flex max-w-md flex-col gap-3">
          <Alert>
            <AlertTitle>Default</AlertTitle>
            <AlertDescription>A neutral, card-toned callout.</AlertDescription>
          </Alert>
          <Alert variant="success">
            <SuccessIcon />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Everything went through.</AlertDescription>
          </Alert>
          <Alert variant="warning">
            <WarningIcon />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>Something needs your attention.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <WarningIcon />
            <AlertTitle>Destructive</AlertTitle>
            <AlertDescription>That action failed.</AlertDescription>
          </Alert>
        </div>
      </Section>

      <Section title="Title only">
        <Alert variant="info" className="max-w-md">
          <InfoIcon />
          <AlertTitle>A single-line, icon-led note.</AlertTitle>
        </Alert>
      </Section>
    </div>
  );
}

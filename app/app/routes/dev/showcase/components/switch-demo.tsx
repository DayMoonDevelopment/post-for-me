import * as React from "react";

import { Label } from "~/ui/label";
import { Switch } from "~/ui/switch";

import { Section } from "./section";

export function SwitchDemo() {
  const [on, setOn] = React.useState(true);
  return (
    <div className="space-y-8">
      <Section title="Controlled">
        <div className="flex items-center gap-3">
          <Switch
            id="switch-demo-controlled"
            checked={on}
            onCheckedChange={setOn}
          />
          <Label htmlFor="switch-demo-controlled">
            {on ? "Enabled" : "Disabled"}
          </Label>
        </div>
      </Section>
      <Section title="States">
        <div className="flex items-center gap-6">
          <Switch defaultChecked aria-label="On by default" />
          <Switch aria-label="Off by default" />
          <Switch defaultChecked disabled aria-label="Disabled on" />
          <Switch disabled aria-label="Disabled off" />
        </div>
      </Section>
    </div>
  );
}

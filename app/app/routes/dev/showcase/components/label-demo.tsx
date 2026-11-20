import { Input } from "~/ui/input";
import { Label } from "~/ui/label";

import { Section } from "./section";

export function LabelDemo() {
  return (
    <div className="space-y-8">
      <Section title="With input">
        <div className="grid w-full max-w-56 gap-2">
          <Label htmlFor="label-demo-email">Email</Label>
          <Input id="label-demo-email" type="email" placeholder="you@example.com" />
        </div>
      </Section>
      <Section title="Disabled pairing">
        <div className="group grid w-full max-w-56 gap-2" data-disabled="true">
          <Label htmlFor="label-demo-disabled">Team name</Label>
          <Input id="label-demo-disabled" disabled placeholder="Disabled" />
        </div>
      </Section>
    </div>
  );
}

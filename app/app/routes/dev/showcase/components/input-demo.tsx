import { Input } from "~/ui/input";

import { Section } from "./section";

export function InputDemo() {
  return (
    <div className="space-y-8">
      <Section title="Types">
        <Input type="text" placeholder="Text" className="max-w-56" />
        <Input type="email" placeholder="you@example.com" className="max-w-56" />
        <Input type="password" placeholder="Password" className="max-w-56" />
        <Input type="number" placeholder="42" className="max-w-56" />
      </Section>
      <Section title="States">
        <Input placeholder="Disabled" disabled className="max-w-56" />
        <Input
          placeholder="Invalid"
          aria-invalid
          defaultValue="not-an-email"
          className="max-w-56"
        />
      </Section>
      <Section title="File">
        <Input type="file" className="max-w-72" />
      </Section>
    </div>
  );
}

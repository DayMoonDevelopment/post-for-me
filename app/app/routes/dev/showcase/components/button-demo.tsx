import { AddIcon, DeleteIcon, SettingsIcon } from "~/icons";
import { Button } from "~/ui/button";

import { Section } from "./section";

export function ButtonDemo() {
  return (
    <div className="space-y-8">
      <Section title="Variants">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </Section>
      <Section title="Sizes">
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
      </Section>
      <Section title="Icon">
        <Button size="icon-xs" variant="outline" aria-label="Add">
          <AddIcon />
        </Button>
        <Button size="icon-sm" variant="outline" aria-label="Settings">
          <SettingsIcon />
        </Button>
        <Button size="icon" variant="destructive" aria-label="Delete">
          <DeleteIcon />
        </Button>
        <Button>
          <AddIcon data-icon="inline-start" />
          With icon
        </Button>
      </Section>
      <Section title="Disabled">
        <Button disabled>Default</Button>
        <Button variant="outline" disabled>
          Outline
        </Button>
        <Button variant="destructive" disabled>
          Destructive
        </Button>
      </Section>
    </div>
  );
}

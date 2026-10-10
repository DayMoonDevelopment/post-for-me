import { Badge } from "~/ui/badge";

import { Section } from "./section";

export function BadgeDemo() {
  return (
    <div className="space-y-8">
      <Section title="Solid">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="focus">Focus</Badge>
        <Badge variant="invert">Invert</Badge>
      </Section>
      <Section title="Light">
        <Badge variant="primary-light">Primary</Badge>
        <Badge variant="info-light">Info</Badge>
        <Badge variant="success-light">Success</Badge>
        <Badge variant="warning-light">Warning</Badge>
        <Badge variant="destructive-light">Destructive</Badge>
        <Badge variant="focus-light">Focus</Badge>
        <Badge variant="invert-light">Invert</Badge>
      </Section>
      <Section title="Outline">
        <Badge variant="primary-outline">Primary</Badge>
        <Badge variant="info-outline">Info</Badge>
        <Badge variant="success-outline">Success</Badge>
        <Badge variant="warning-outline">Warning</Badge>
        <Badge variant="destructive-outline">Destructive</Badge>
        <Badge variant="focus-outline">Focus</Badge>
        <Badge variant="invert-outline">Invert</Badge>
      </Section>
      <Section title="Sizes">
        <Badge size="xs">Extra small</Badge>
        <Badge size="sm">Small</Badge>
        <Badge size="default">Default</Badge>
        <Badge size="lg">Large</Badge>
        <Badge size="xl">Extra large</Badge>
      </Section>
      <Section title="Radius">
        <Badge radius="default">Default</Badge>
        <Badge radius="full">Full</Badge>
      </Section>
    </div>
  );
}

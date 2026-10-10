import {
  ProjectTypeAvatar,
  ProjectTypeBadge,
  ProjectTypeIcon,
} from "~/ui/project-type-badge";

import { Section } from "./section";

export function ProjectTypeBadgeDemo() {
  return (
    <div className="space-y-8">
      <Section title="Soft">
        <ProjectTypeBadge type="quickstart" />
        <ProjectTypeBadge type="white-label" />
      </Section>
      <Section title="Solid">
        <ProjectTypeBadge type="quickstart" variant="solid" />
        <ProjectTypeBadge type="white-label" variant="solid" />
      </Section>
      <Section title="Ghost (trailing descriptor)">
        <ProjectTypeBadge type="quickstart" variant="ghost" />
        <ProjectTypeBadge type="white-label" variant="ghost" />
      </Section>
      <Section title="Icon only">
        <ProjectTypeIcon type="quickstart" className="size-5" />
        <ProjectTypeIcon type="white-label" className="size-5" />
      </Section>
      <Section title="Avatar (brand fill + type icon)">
        <ProjectTypeAvatar type="quickstart" className="size-10" />
        <ProjectTypeAvatar type="white-label" className="size-10" />
        <ProjectTypeAvatar type="quickstart" shape="circle" className="size-10" />
      </Section>
      <Section title="Composes with the dark system theme">
        <div className="dark flex flex-wrap gap-3 rounded-lg bg-background p-4">
          <ProjectTypeBadge type="quickstart" />
          <ProjectTypeBadge type="white-label" />
          <ProjectTypeBadge type="quickstart" variant="solid" />
          <ProjectTypeBadge type="white-label" variant="solid" />
        </div>
      </Section>
    </div>
  );
}

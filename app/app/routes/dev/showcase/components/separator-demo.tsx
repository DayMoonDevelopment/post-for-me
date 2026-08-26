import { Separator } from "~/ui/separator";

import { Section } from "./section";

export function SeparatorDemo() {
  return (
    <div className="space-y-8">
      <Section title="Horizontal">
        <div className="w-full max-w-sm space-y-3 text-sm">
          <p>Drafts</p>
          <Separator />
          <p>Scheduled</p>
          <Separator />
          <p>Published</p>
        </div>
      </Section>
      <Section title="Vertical">
        <div className="flex h-5 items-center gap-3 text-sm">
          <span>Posts</span>
          <Separator orientation="vertical" />
          <span>Accounts</span>
          <Separator orientation="vertical" />
          <span>Webhooks</span>
        </div>
      </Section>
    </div>
  );
}

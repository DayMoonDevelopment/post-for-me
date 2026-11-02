import { Copyable } from "~/ui/copyable";

import { Section } from "./section";

const PFM_ID = "sa_3kf9d72bnq10x8zv";
const SNIPPET = `client.socialAccounts.createAuthURL({ platform: "instagram" })`;

export function CopyableDemo() {
  return (
    <div className="space-y-8">
      <Section title="Value + trailing copy">
        <Copyable value={PFM_ID}>
          <span className="font-mono">{PFM_ID}</span>
        </Copyable>
      </Section>
      <Section title="Icon only">
        <Copyable value={PFM_ID} label="Copy ID" />
      </Section>
      <Section title="Leading icon">
        <Copyable value={PFM_ID} icon="start">
          <span className="font-mono">{PFM_ID}</span>
        </Copyable>
      </Section>
      <Section title="Truncated inline (grid cell)">
        <div className="w-40 rounded-md border border-border p-2">
          <Copyable value={PFM_ID} className="w-full">
            <span className="truncate font-mono">{PFM_ID}</span>
          </Copyable>
        </div>
      </Section>
      <Section title="Click-to-copy region (no icon)">
        <Copyable
          value={SNIPPET}
          icon="none"
          className="block max-w-md rounded-md bg-muted px-3 py-2 text-left font-mono"
        >
          <span className="truncate">{SNIPPET}</span>
        </Copyable>
      </Section>
      <Section title="No tooltip">
        <Copyable value={PFM_ID} tooltip={false}>
          <span className="font-mono">{PFM_ID}</span>
        </Copyable>
      </Section>
    </div>
  );
}

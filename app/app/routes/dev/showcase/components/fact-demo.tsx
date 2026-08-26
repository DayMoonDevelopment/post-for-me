import { Badge } from "~/ui/badge";
import { Copyable } from "~/ui/copyable";
import { Fact } from "~/ui/fact";

import { Section } from "./section";

export function FactDemo() {
  return (
    <div className="space-y-8">
      <Section title="Single">
        <Fact label="Connected">May 15, 2026</Fact>
      </Section>

      <Section title="Values: text, badge, copyable">
        <div className="grid w-full max-w-2xl grid-cols-3 gap-x-10 gap-y-5">
          <Fact label="ID">
            <Copyable value="sa_3kf9d72bnq10x8zv">
              <span className="truncate font-mono">sa_3kf9d72bnq10x8zv</span>
            </Copyable>
          </Fact>
          <Fact label="Platform">Instagram</Fact>
          <Fact label="Status">
            <Badge variant="success-light" size="sm">
              Connected
            </Badge>
          </Fact>
          <Fact label="Connected">May 15, 2026</Fact>
          <Fact label="Posts">128</Fact>
        </div>
      </Section>
    </div>
  );
}

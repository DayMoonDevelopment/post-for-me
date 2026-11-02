import { DATE_FORMAT, LocaleDateTime } from "~/ui/date-time";

import { Section } from "./section";

const SAMPLES = [
  "2026-06-25T15:15:00Z",
  "2026-01-02T00:05:00Z",
  "2025-12-31T23:59:00Z",
];

export function DateTimeDemo() {
  return (
    <div className="space-y-8">
      <Section title="Default (date + time, viewer's locale & timezone)">
        <div className="flex flex-col gap-1 text-sm text-foreground">
          {SAMPLES.map((iso) => (
            <LocaleDateTime key={iso} value={iso} />
          ))}
        </div>
      </Section>
      <Section title="Date only">
        <div className="flex flex-col gap-1 text-sm text-foreground">
          {SAMPLES.map((iso) => (
            <LocaleDateTime key={iso} value={iso} pattern={DATE_FORMAT} />
          ))}
        </div>
      </Section>
    </div>
  );
}

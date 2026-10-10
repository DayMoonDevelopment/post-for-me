import { ALL_PLATFORMS, brandProvider } from "~/lib/platform-meta";
import { BrandMark } from "~/ui/brand-mark";

import { Section } from "./section";

export function BrandMarkDemo() {
  return (
    <div className="space-y-8">
      <Section title="Brand marks">
        {ALL_PLATFORMS.map((platform) => (
          <div
            key={platform.id}
            className="flex w-24 flex-col items-center gap-1.5 text-muted-foreground"
          >
            <BrandMark
              platform={brandProvider(platform.id)}
              className="size-6"
            />
            <span className="text-center text-xs">{platform.label}</span>
          </div>
        ))}
      </Section>
    </div>
  );
}

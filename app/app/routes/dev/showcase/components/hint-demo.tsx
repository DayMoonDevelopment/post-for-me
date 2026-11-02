import { Hint, HintIcon, HintText } from "~/ui/hint";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/ui/hover-card";

import { Section } from "./section";

export function HintDemo() {
  return (
    <div className="space-y-8">
      <Section title="Sizes (icon only)">
        <p className="mb-3 max-w-md text-sm text-muted-foreground">
          Idle, the icon gently scales/breathes; hovering highlights the whole
          hint (rounded-full) and pauses the motion. Amber <code>hint</code>{" "}
          colorspace.
        </p>
        <div className="flex items-center gap-4">
          <Hint size="sm">
            <HintIcon />
          </Hint>
          <Hint>
            <HintIcon />
          </Hint>
        </div>
      </Section>

      <Section title="With text">
        <Hint size="sm">
          <HintIcon />
          <HintText>Tip</HintText>
        </Hint>
      </Section>

      <Section title="In a HoverCard">
        <HoverCard>
          <HoverCardTrigger
            render={
              <Hint size="sm">
                <HintIcon />
              </Hint>
            }
          />
          <HoverCardContent>
            <p className="text-muted-foreground">
              Hover the lightbulb to reveal a nicely formatted tip.
            </p>
          </HoverCardContent>
        </HoverCard>
      </Section>
    </div>
  );
}

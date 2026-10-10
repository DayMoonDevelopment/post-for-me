import * as React from "react";

import {
  AccountIcon,
  AiAgentIcon,
  DeveloperIcon,
  MarketingIcon,
} from "~/icons";
import {
  Choicebox,
  ChoiceboxItem,
  ChoiceboxItemContent,
  ChoiceboxItemDescription,
  ChoiceboxItemIcon,
  ChoiceboxItemIndicator,
  ChoiceboxItemTitle,
} from "~/ui/choicebox";

import { Section } from "./section";

const options = [
  {
    value: "saas",
    icon: DeveloperIcon,
    title: "Building a SaaS",
    description: "I'm adding social posting to my product.",
  },
  {
    value: "marketing",
    icon: MarketingIcon,
    title: "Automating marketing",
    description: "I'm scheduling content for brands or campaigns.",
  },
  {
    value: "personal",
    icon: AccountIcon,
    title: "Managing my own accounts",
    description: "I'm posting to my own social profiles.",
  },
  {
    value: "agent",
    icon: AiAgentIcon,
    title: "Building agent workflows",
    description: "My AI agents post and manage socials for me.",
  },
];

function items() {
  return options.map((option) => (
    <ChoiceboxItem key={option.value} value={option.value}>
      <ChoiceboxItemIcon>
        <option.icon />
      </ChoiceboxItemIcon>
      <ChoiceboxItemContent>
        <ChoiceboxItemTitle>{option.title}</ChoiceboxItemTitle>
        <ChoiceboxItemDescription>
          {option.description}
        </ChoiceboxItemDescription>
      </ChoiceboxItemContent>
      <ChoiceboxItemIndicator />
    </ChoiceboxItem>
  ));
}

export function ChoiceboxDemo() {
  const [single, setSingle] = React.useState<string[]>(["saas"]);
  const [multi, setMulti] = React.useState<string[]>(["saas", "agent"]);
  const [card, setCard] = React.useState<string[]>(["saas"]);

  return (
    <div className="space-y-8">
      <Section title="Single select — radio indicator">
        <Choicebox
          className="w-full max-w-md"
          value={single}
          onValueChange={(value) => setSingle(value)}
        >
          {items()}
        </Choicebox>
      </Section>
      <Section title="Multi select — checkbox indicator">
        <Choicebox
          multiple
          className="w-full max-w-md"
          value={multi}
          onValueChange={(value) => setMulti(value)}
        >
          {items()}
        </Choicebox>
      </Section>
      <Section title="Vertical orientation — cards in a grid">
        <Choicebox
          orientation="vertical"
          className="grid w-full max-w-md grid-cols-2 gap-3"
          value={card}
          onValueChange={(value) => setCard(value)}
        >
          {items()}
        </Choicebox>
      </Section>
    </div>
  );
}

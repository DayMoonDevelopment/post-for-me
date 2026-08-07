import { AccountIcon, SearchIcon } from "~/icons";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "~/ui/input-group";

import { Section } from "./section";

export function InputGroupDemo() {
  return (
    <div className="space-y-8">
      <Section title="Leading icon addon">
        <InputGroup className="max-w-72">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput placeholder="Search…" />
        </InputGroup>
      </Section>
      <Section title="Trailing button addon">
        <InputGroup className="max-w-72">
          <InputGroupInput placeholder="Project slug" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton variant="outline">Check</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </Section>
      <Section title="Leading + trailing">
        <InputGroup className="max-w-72">
          <InputGroupAddon>
            <AccountIcon />
          </InputGroupAddon>
          <InputGroupInput placeholder="username" />
          <InputGroupAddon align="inline-end">
            <InputGroupText>.postforme.dev</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </Section>
    </div>
  );
}

import { useState } from "react";

import { Field, FieldLabel, FieldSet, FieldTitle } from "~/ui/field";
import { RadioGroup, RadioGroupItem } from "~/ui/radio-group";

import { Section } from "./section";

export function RadioGroupDemo() {
  const [plan, setPlan] = useState("monthly");

  return (
    <div className="space-y-8">
      <Section title="Choice cards (2 columns)">
        <FieldSet className="max-w-md">
          <RadioGroup
            value={plan}
            onValueChange={(value) => setPlan(value as string)}
            className="grid grid-cols-2 gap-2"
          >
            {[
              { value: "monthly", label: "Monthly" },
              { value: "yearly", label: "Yearly" },
            ].map((option) => {
              const id = `plan-${option.value}`;
              return (
                <FieldLabel key={option.value} htmlFor={id}>
                  <Field orientation="horizontal">
                    <FieldTitle>{option.label}</FieldTitle>
                    <RadioGroupItem value={option.value} id={id} />
                  </Field>
                </FieldLabel>
              );
            })}
          </RadioGroup>
        </FieldSet>
      </Section>

      <Section title="Stacked list">
        <RadioGroup
          value={plan}
          onValueChange={(value) => setPlan(value as string)}
          className="max-w-md"
        >
          {[
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Yearly" },
          ].map((option) => {
            const id = `plan-list-${option.value}`;
            return (
              <div key={option.value} className="flex items-center gap-2.5">
                <RadioGroupItem value={option.value} id={id} />
                <FieldLabel htmlFor={id} className="font-normal">
                  {option.label}
                </FieldLabel>
              </div>
            );
          })}
        </RadioGroup>
      </Section>
    </div>
  );
}

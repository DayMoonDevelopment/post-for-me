import { Field, FieldLabel } from "~/ui/field";
import { Textarea } from "~/ui/textarea";

import { Section } from "./section";

export function TextareaDemo() {
  return (
    <div className="space-y-8">
      <Section title="Default">
        <Field className="w-full max-w-72">
          <FieldLabel htmlFor="textarea-demo">Notes</FieldLabel>
          <Textarea id="textarea-demo" rows={3} placeholder="Add a note…" />
        </Field>
      </Section>
      <Section title="Disabled">
        <Textarea
          className="max-w-72"
          rows={3}
          disabled
          placeholder="Disabled"
        />
      </Section>
    </div>
  );
}

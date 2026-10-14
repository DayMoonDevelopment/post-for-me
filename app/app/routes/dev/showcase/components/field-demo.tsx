import { Button } from "~/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "~/ui/field";
import { Input } from "~/ui/input";

import { Section } from "./section";

export function FieldDemo() {
  return (
    <div className="space-y-8">
      <Section title="Form layout">
        <FieldSet className="w-full max-w-sm">
          <FieldLegend>Profile</FieldLegend>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="field-demo-name">Display name</FieldLabel>
              <Input id="field-demo-name" placeholder="Day Moon" />
              <FieldDescription>Shown on scheduled posts.</FieldDescription>
            </Field>
            <FieldSeparator>Contact</FieldSeparator>
            <Field data-invalid="true">
              <FieldLabel htmlFor="field-demo-email">Email</FieldLabel>
              <Input
                id="field-demo-email"
                aria-invalid
                defaultValue="not-an-email"
              />
              <FieldError>Enter a valid email address.</FieldError>
            </Field>
            <Field>
              <Button type="button">Save</Button>
            </Field>
          </FieldGroup>
        </FieldSet>
      </Section>
    </div>
  );
}

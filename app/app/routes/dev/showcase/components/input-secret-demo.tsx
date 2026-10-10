import * as React from "react";

import { Field, FieldDescription, FieldLabel } from "~/ui/field";
import { InputSecret } from "~/ui/input-secret";

export function InputSecretDemo() {
  const [value, setValue] = React.useState("sk_live_2f8a91c0d4e7");
  return (
    <Field className="w-full max-w-72">
      <FieldLabel htmlFor="input-secret-demo">App secret</FieldLabel>
      <InputSecret
        id="input-secret-demo"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <FieldDescription>
        Composed from InputGroup. Not a `type=password` field, so no OS
        password-manager suggestions.
      </FieldDescription>
    </Field>
  );
}

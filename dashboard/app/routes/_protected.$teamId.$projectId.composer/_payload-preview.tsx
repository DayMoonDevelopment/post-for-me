import { useFormContext } from "react-hook-form";

import { BracketsIcon } from "~/components/icons";

import {
  CodeBlock,
  CodeBlockBody,
  CodeBlockContent,
  CodeBlockHeader,
  CodeBlockCopyButton,
} from "~/components/code-block";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "~/ui/dialog";
import { Button } from "~/ui/button";

import { cleanPayload } from "./utils";

import type { FormSchema } from "./schema";

export function PayloadPreview() {
  const { watch } = useFormContext();
  const formValues = watch() as FormSchema;

  const payload = cleanPayload(formValues);

  const jsonString = JSON.stringify(payload, null, 2);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" type="button">
          <BracketsIcon />
          Preview Payload
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>API Payload Preview</DialogTitle>
          <DialogDescription>
            {`Based on the way you've configured your post, this is the JSON payload that can be sent to the API.`}
          </DialogDescription>
        </DialogHeader>
        <CodeBlock defaultValue={jsonString}>
          <CodeBlockHeader>
            <CodeBlockCopyButton />
          </CodeBlockHeader>
          <CodeBlockBody value={jsonString}>
            <CodeBlockContent language="json">{jsonString}</CodeBlockContent>
          </CodeBlockBody>
        </CodeBlock>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";

import { useFetcher, useRevalidator } from "react-router";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "~/ui/dialog";
import { Button } from "~/ui/button";
import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";
import { TriangleExclamationIcon } from "~/components/icons";

export function CreatedDialog() {
  const fetcher = useFetcher({ key: "create-api-key" });
  const revalidator = useRevalidator();

  const [copied, setCopied] = useState(false);

  const key = fetcher.data?.result?.key;
  const isOpen = !!key;

  const copyToClipboard = () => {
    if (key) {
      navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 5000);
    }
  };

  function reset(nextOpen: boolean) {
    if (isOpen && !nextOpen) {
      revalidator.revalidate();
      fetcher.submit({}, { action: "/data/reset-fetcher", method: "post" });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={reset}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>API Key Created</DialogTitle>
        </DialogHeader>

        <div className="mt-4 bg-muted border border-muted-foreground/10 pl-3 pr-2 py-2 rounded-lg overflow-x-auto flex justify-between items-center">
          <pre>
            <span>{key}</span>
          </pre>

          <Button onClick={copyToClipboard} variant="ghost" size="sm">
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>

        <Alert>
          <TriangleExclamationIcon />
          <AlertTitle>Make sure to save your key somewhere safe</AlertTitle>
          <AlertDescription>{`You won't be able to see it again.`}</AlertDescription>
        </Alert>

        <DialogFooter>
          <DialogClose asChild>
            <Button>Finished</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

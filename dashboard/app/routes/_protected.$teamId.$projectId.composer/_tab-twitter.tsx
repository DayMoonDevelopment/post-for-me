import { CircleInfoIcon } from "~/components/icons";

import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";

export function TabTwitter() {
  return (
    <div className="flex flex-col gap-8">
      <Alert>
        <CircleInfoIcon />
        <AlertTitle>
          X (Twitter) overrides in the playground will come soon.
        </AlertTitle>
        <AlertDescription>
          You can still apply override configurations for X (Twitter) accounts
          from the API.
        </AlertDescription>
      </Alert>
    </div>
  );
}

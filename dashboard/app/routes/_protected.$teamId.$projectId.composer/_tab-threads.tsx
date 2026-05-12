import { CircleInfoIcon } from "~/components/icons";

import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";

export function TabThreads() {
  return (
    <div className="flex flex-col gap-8">
      <Alert>
        <CircleInfoIcon />
        <AlertTitle>
          Threads overrides in the playground will come soon.
        </AlertTitle>
        <AlertDescription>
          You can still apply override configurations for Threads accounts from
          the API.
        </AlertDescription>
      </Alert>
    </div>
  );
}

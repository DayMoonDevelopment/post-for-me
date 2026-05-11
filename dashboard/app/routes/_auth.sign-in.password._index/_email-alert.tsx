import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";

import { PaperPlaneIcon } from "~/components/icons";

export function EmailAlert() {
  return (
    <Alert variant="affirmative">
      <PaperPlaneIcon className="size-4 text-current" />
      <AlertTitle>Your Magic Link is on the way!</AlertTitle>
      <AlertDescription>
        Follow the link in your email to finish signing in.
        <p className="text-xs italic">You can safely close this page.</p>
      </AlertDescription>
    </Alert>
  );
}

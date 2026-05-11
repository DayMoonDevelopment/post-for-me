import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";
import { PaperPlaneIcon } from "~/components/icons";

export function EmailAlert() {
  return (
    <Alert variant="affirmative">
      <PaperPlaneIcon className="size-4 text-current" />
      <AlertTitle>Your password reset link is on the way!</AlertTitle>
      <AlertDescription>
        Check your inbox and follow the link to reset your password.
        <p className="text-xs italic">You can safely close this page.</p>
      </AlertDescription>
    </Alert>
  );
}

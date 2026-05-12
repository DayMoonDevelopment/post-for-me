import { useSearchParams } from "react-router";

import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";
import { TriangleExclamationIcon } from "~/components/icons";

function errorMessage(code: string | null) {
  if (code === "invalid_email") {
    return "Please enter a valid email address.";
  }

  if (code === "reset_failed") {
    return "We couldn’t send the reset link. Please try again later.";
  }

  if (code === "network_error") {
    return "A network error occurred. Please check your connection and try again.";
  }

  return "Something went wrong. Please try again.";
}

export function ErrorAlert() {
  const [searchParams] = useSearchParams();
  const errorCode = searchParams.get("error_code");

  if (!errorCode) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <TriangleExclamationIcon className="size-4" />
      <AlertTitle>We couldn’t send the reset link</AlertTitle>
      <AlertDescription>{errorMessage(errorCode)}</AlertDescription>
    </Alert>
  );
}

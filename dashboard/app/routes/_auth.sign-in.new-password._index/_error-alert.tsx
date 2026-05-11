import { useSearchParams } from "react-router";
import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";
import { TriangleExclamationIcon } from "~/components/icons";

function errorMessage(code: string | null) {
  switch (code) {
    case "invalid_password":
      return "Passwords do not match or are missing. Please check both fields.";
    case "missing_token":
      return "Reset token is missing or invalid. Please use the reset link from your email.";
    case "session_error":
      return "Could not establish session. Please try using the link again.";
    case "update_failed":
      return "We couldn’t update your password. Please try again later.";
    case "network_error":
      return "A network error occurred. Please check your connection and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function ErrorAlert() {
  const [searchParams] = useSearchParams();
  const errorCode = searchParams.get("error_code");

  if (!errorCode) return null;

  return (
    <Alert variant="destructive">
      <TriangleExclamationIcon className="size-4" />
      <AlertTitle>We couldn’t update your password</AlertTitle>
      <AlertDescription>{errorMessage(errorCode)}</AlertDescription>
    </Alert>
  );
}

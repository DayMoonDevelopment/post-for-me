import { useSearchParams } from "react-router";

import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";

import { TriangleExclamationIcon } from "~/components/icons";

function errorMessage(code: string | null) {
  if (code === "link_expired") {
    return "Your magic link has expired. Please try again.";
  }

  if (code === "invalid_credentials") {
    return "Invalid email or password. Please check your credentials and try again.";
  }

  if (code === "email_required") {
    return "Email is required to sign in.";
  }

  if (code === "password_required") {
    return "Password is required to sign in.";
  }

  if (code === "network_error") {
    return "Network error. Please check your connection and try again.";
  }

  if (code === "auth_failed") {
    return "Authentication failed. Please try again.";
  }

  // TODO: This message is related to legacy magic link handling.
  // Once the new /sign-in/magiclink route is stable and legacy handling is removed,
  // consider moving or deleting this error case.
  if (code === "magiclink_failed") {
    return "Failed to send magic link. Please try again.";
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
      <AlertTitle>We were unable to log you in</AlertTitle>
      <AlertDescription>{errorMessage(errorCode)}</AlertDescription>
    </Alert>
  );
}

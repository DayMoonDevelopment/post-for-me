import { useSearchParams } from "react-router";

import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";

import { TriangleExclamationIcon } from "~/components/icons";

function errorMessage(code: string | null) {
  if (code === "link_expired") {
    return "Your magic link has expired. Please try again.";
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

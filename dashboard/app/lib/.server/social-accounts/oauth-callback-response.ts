import { redirect } from "react-router";

export function parseOauthCallbackError(url: URL, provider: string | undefined) {
  const oauthError = url.searchParams.get("error");
  const oauthErrorReason = url.searchParams.get("error_reason");
  const oauthErrorDescription = url.searchParams.get("error_description");
  const oauthErrorMessage = oauthError
    ? (oauthErrorDescription || oauthErrorReason || oauthError).replace(
        /\|/g,
        " ",
      )
    : null;

  if (oauthError) {
    console.error(
      "OAuth provider returned an error during account connection",
      {
        provider,
        error: oauthError,
        error_reason: oauthErrorReason,
        error_description: oauthErrorDescription,
      },
    );
  }

  return { oauthError, oauthErrorReason, oauthErrorDescription, oauthErrorMessage };
}

//Either return to component or redirect to project callback url
export const createOauthCallbackResponse = ({
  teamId,
  projectId,
  provider,
  isSuccess,
  callbackUrl,
  accountIds,
  failedAccountIds,
  errors,
  isLoggedIn,
}: {
  teamId?: string;
  projectId?: string;
  provider?: string;
  isSuccess: boolean;
  accountIds?: string[];
  failedAccountIds?: string[];
  errors?: string[];
  callbackUrl?: string | null | undefined;
  isLoggedIn?: boolean;
}) => {
  const error = errors && errors.length > 0 ? errors.join("|") : null;

  if (callbackUrl) {
    const authParams = new URLSearchParams([
      ["provider", provider || ""],
      ["projectId", projectId || ""],
      ["isSuccess", isSuccess ? "true" : "false"],
      ["accountIds", accountIds?.join(",") || ""],
    ]);

    if (failedAccountIds && failedAccountIds.length > 0) {
      authParams.append("failedAccountIds", failedAccountIds?.join(","));
    }

    if (error) {
      authParams.append("error", error);
    }

    return redirect(`${callbackUrl}?${authParams.toString()}`);
  }

  return {
    teamId,
    projectId,
    provider,
    isSuccess,
    accountIds,
    failedAccountIds,
    error,
    isLoggedIn,
  };
};

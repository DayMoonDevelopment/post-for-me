import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router";

import { getRouteError } from "~/lib/route-errors";
import { reportRouteError } from "~/tracking/route-error";
import { Button } from "~/ui/button";

export function ProjectRouteError({ error }: { error: unknown }) {
  const { teamId, projectId } = useParams();
  const { pathname } = useLocation();
  const details = getRouteError(error);
  const [clientReference, setClientReference] = useState<string>();
  const reported = useRef<unknown>(null);

  useEffect(() => {
    if (reported.current === error) return;
    reported.current = error;
    const referenceId = details.referenceId ?? crypto.randomUUID();
    setClientReference(referenceId);
    void reportRouteError({
      error,
      code: details.code,
      referenceId,
      pathname,
      teamId,
      projectId,
    });
  }, [error, details.code, details.referenceId, pathname, teamId, projectId]);

  const referenceId = details.referenceId ?? clientReference;
  const accountsUrl =
    teamId && projectId ? `/${teamId}/${projectId}/accounts` : undefined;

  return (
    <main className="container mx-auto flex flex-col items-center gap-4 px-4 pt-16 text-center">
      <img src="/error.png" alt="" className="size-24" />
      <div className="flex max-w-md flex-col gap-2" role="alert">
        <h1 className="text-2xl font-semibold">
          {details.status === 401
            ? "Please sign in again"
            : "Unable to load this page"}
        </h1>
        <p className="text-muted-foreground">{details.message}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {details.status === 401 ? (
          <Button asChild>
            <a href="/logout">Sign in again</a>
          </Button>
        ) : (
          <Button onClick={() => window.location.reload()}>Try again</Button>
        )}
        {accountsUrl ? (
          <Button variant="outline" asChild>
            <a href={accountsUrl}>Back to accounts</a>
          </Button>
        ) : null}
      </div>
      {referenceId ? (
        <p className="text-xs text-muted-foreground">
          Support reference: <code>{referenceId}</code>
        </p>
      ) : null}
      {import.meta.env.DEV && error instanceof Error ? (
        <pre className="w-full overflow-x-auto rounded border bg-muted p-4 text-left text-xs">
          {error.stack}
        </pre>
      ) : null}
    </main>
  );
}

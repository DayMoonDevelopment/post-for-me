import { TriangleExclamationIcon } from "icons";
import {
  Link,
  Outlet,
  useLoaderData,
  useParams,
  useRouteLoaderData,
} from "react-router";
import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";
import { Button } from "~/ui/button";
import type { loader as teamLoader } from "~/routes/_protected.$teamId/route";
import type { loader } from "./route.loader";

export function Component() {
  const loaderData = useRouteLoaderData<typeof teamLoader>(
    "routes/_protected.$teamId",
  );

  const { project } = useLoaderData<typeof loader>();

  const { teamId } = useParams();

  return (
    <>
      {(project?.is_system && loaderData?.billing?.creds_addon) ||
      !project?.is_system ||
      !loaderData?.billing?.active ? null : (
        <div className="p-4">
          <Alert variant="highlight" className="@container">
            <TriangleExclamationIcon />

            <div className="flex flex-col gap-4 @md:flex-row @md:items-start @md:justify-between">
              <div>
                <AlertTitle>Enable the system credentials addon</AlertTitle>
                <AlertDescription>
                  To get started creating API keys to integrate into your
                  application, you need to enable the system credentials addon.
                </AlertDescription>
              </div>

              <Button asChild className="self-center">
                <Link to={`/${teamId}/billing`} prefetch="render">
                  Get started
                </Link>
              </Button>
            </div>
          </Alert>
        </div>
      )}

      <div className="p-4">
        <Outlet />
      </div>
    </>
  );
}

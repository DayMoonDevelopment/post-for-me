import { Outlet, useLoaderData, useRouteLoaderData } from "react-router";
import { Link } from "react-router";
import { SocialConnectionsDataTable } from "./_data-table";
import { Button } from "~/ui/button";
import { PersonAddIcon } from "icons";

import type { loader } from "./route.loader";
import type { loader as teamData } from "../_protected.$teamId/route.loader";
import type { loader as projectData } from "../_protected.$teamId.$projectId/route.loader";

export function Component() {
  const data = useLoaderData<typeof loader>();
  const loaderData = useRouteLoaderData<typeof teamData>(
    "routes/_protected.$teamId"
  );

  const projectLoaderData = useRouteLoaderData<typeof projectData>(
    "routes/_protected.$teamId.$projectId"
  );

  const billingActive = loaderData?.billing?.active || false;
  const connectButtonDisabled =
    !billingActive ||
    (projectLoaderData?.project?.is_system &&
      !loaderData?.billing?.creds_addon);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="px-1">
          <h2 className="font-semibold text-lg">Connected Accounts</h2>
          <p className="text-sm text-muted-foreground">
            {`Manage your project's connected social media accounts.`}
          </p>
        </div>

        {connectButtonDisabled ? (
          <Button disabled={true}>
            <PersonAddIcon />
            <span>Connect an account</span>
          </Button>
        ) : (
          <Button asChild>
            <Link to="connect">
              <PersonAddIcon />
              <span>Connect an account</span>
            </Link>
          </Button>
        )}
      </div>

      <SocialConnectionsDataTable data={data} />

      <Outlet />
    </div>
  );
}

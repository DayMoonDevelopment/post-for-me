import { Link, Outlet, useLoaderData, useParams } from "react-router";

import { Button } from "~/ui/button";
import { Card, CardContent } from "~/ui/card";
import { ConnectedGrid } from "./_connected-grid";
import { UnstartedGrid } from "./_unstarted-grid";
import type { loader } from "./route.loader";

export function Component() {
  const { teamId } = useParams();

  const { isSystem } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-8">
      <ConnectedGrid />

      <UnstartedGrid />

      <Card>
        <CardContent className="p-6 text-center space-y-4">
          {!isSystem ? (
            <>
              <h3 className="text-lg font-semibold">
                Don&apos;t have your own credentials?
              </h3>
              <p className="text-muted-foreground">
                Create a new Quickstart Project
              </p>
              <Button asChild>
                <Link to={`/${teamId}/new`}>Create project</Link>
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold">
                Have your own credentials?
              </h3>
              <p className="text-muted-foreground">
                Create a new White Label Project
              </p>
              <Button asChild>
                <Link to={`/${teamId}/new`}>Create project</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Outlet />
    </div>
  );
}

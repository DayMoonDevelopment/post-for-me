import { Link, useRouteLoaderData } from "react-router";
import { FolderIcon, PlusLargeIcon } from "~/components/icons";

import { Card, CardContent, CardFooter } from "~/ui/card";
import { Separator } from "~/ui/separator";
import { Button } from "~/ui/button";
import { CreateProjectCard } from "./_create-project-card";

import type { loader } from "~/routes/_protected.$teamId/route";

export function Component() {
  const data = useRouteLoaderData<typeof loader>("routes/_protected.$teamId");

  const projects = data?.projects || [];
  const teamId = data?.team?.id;

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <FolderIcon className="size-20 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No projects yet</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Start by creating your first project to connect social accounts and
          begin posting.
        </p>
        <Link to={`/${teamId}/new`}>
          <Button
            type="submit"
            className="flex items-center gap-2 cursor-pointer"
          >
            <PlusLargeIcon className="size-4" />
            Create Project
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {teamId ? <CreateProjectCard teamId={teamId} /> : null}
      {projects.map(({ name, id }) => (
        <Link
          to={id}
          key={id}
          className="hover:scale-[1.01] transition-transform"
        >
          <Card className="gap-0 bg-muted p-0 overflow-hidden">
            <CardContent className="flex items-center justify-center p-8">
              <FolderIcon className="size-16 text-muted-foreground" />
            </CardContent>

            <Separator />
            <CardFooter className="py-3 px-4 bg-card">{name}</CardFooter>
          </Card>
        </Link>
      ))}
    </div>
  );
}

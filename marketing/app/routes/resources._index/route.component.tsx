import { useLoaderData, useRouteLoaderData } from "react-router";

import { PostGrid } from "./components/post-grid";

import type { Route } from "./+types/route";
import type { loader } from "~/routes/resources/route";

type ResourcesLoader = Awaited<ReturnType<typeof loader>>;

export function Component() {
  const { title, summary } =
    useLoaderData<Route.ComponentProps["loaderData"]>();
  const resourcesLoaderData =
    useRouteLoaderData<ResourcesLoader["data"]>("routes/resources");

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-semibold mb-2">{title}</h1>
        <p className="text-base leading-tight text-muted-foreground max-w-2xl text-balance">
          {summary}
        </p>
      </div>

      {resourcesLoaderData?.posts && resourcesLoaderData?.tags ? (
        <PostGrid tags={resourcesLoaderData.tags} posts={resourcesLoaderData.posts} />
      ) : (
        <div>No resources found</div>
      )}
    </div>
  );
}

import { Suspense } from "react";
import { Await, useLoaderData, useRouteLoaderData } from "react-router";

import { PostGrid, PostGridSkeleton } from "./components/post-grid";

import type { loader } from "~/routes/resources/route";
import type { Route } from "./+types/route";

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

      <Suspense fallback={<PostGridSkeleton />}>
        {resourcesLoaderData?.posts && resourcesLoaderData?.tags ? (
          <Await resolve={resourcesLoaderData?.posts}>
            {(data) => (
              <PostGrid tags={resourcesLoaderData.tags} posts={data} />
            )}
          </Await>
        ) : (
          <div>failed</div>
        )}
      </Suspense>
    </div>
  );
}

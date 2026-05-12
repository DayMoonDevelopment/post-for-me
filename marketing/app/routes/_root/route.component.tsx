import { Outlet, useLoaderData } from "react-router";

import { Footer } from "~/components/footer";
import { Navigation } from "~/components/navigation/navigation";

import type { Route } from "./+types/route";

export function Component() {
  const { featuredResources, solutionPreviews } =
    useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="relative">
      <Navigation
        resources={featuredResources}
        solutions={solutionPreviews}
      />

      <div className="pb-12">
        <Outlet />
      </div>

      <Footer resources={featuredResources} />
    </div>
  );
}

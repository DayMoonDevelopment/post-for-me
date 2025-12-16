import { Outlet, useLoaderData } from "react-router";

import { Navbar } from "~/components/navbar";
import { Footer } from "~/components/footer";

import type { Route } from "./+types/route";

export function Component() {
  const { featuredResources } =
    useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="relative">
      <Navbar
        resources={featuredResources.map((resource) => ({
          title: resource.title,
          description: resource.description,
          href: `/resources/${resource.slug}`,
        }))}
      />

      <div className="pb-12">
        <Outlet />
      </div>

      <Footer />
    </div>
  );
}

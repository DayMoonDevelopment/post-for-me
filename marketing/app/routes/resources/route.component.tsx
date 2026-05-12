import { Outlet, useLoaderData } from "react-router";

import { Footer } from "~/components/footer";
import { Navigation } from "~/components/navigation/navigation";

import { Separator } from "~/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "~/ui/sidebar";

import { ResourcesSidebar } from "./components/resources-sidebar";

import type { Route } from "./+types/route";

export function Component() {
  const { tags, posts, featuredResources, solutionPreviews } =
    useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="relative">
      <Navigation resources={featuredResources} solutions={solutionPreviews} />
      <SidebarProvider>
        <ResourcesSidebar className="pt-16" tags={tags} posts={posts} />
        <SidebarInset className="flex flex-col pt-20 relative">
          <SidebarTrigger className="fixed top-20 ml-3 bg-background" />

          <div className={`pr-4 pl-12 pb-12 overflow-auto`}>
            <Outlet />
          </div>

          <Separator className="mb-12" />

          <Footer resources={featuredResources} />
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

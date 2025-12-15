import { Outlet, useLoaderData, Await } from "react-router";
import { Suspense } from "react";

import { Navbar } from "~/components/navbar";
import { Footer } from "~/components/footer";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "~/ui/sidebar";
import { Separator } from "~/ui/separator";

import { ResourcesSidebar } from "./components/resources-sidebar";

import type { Route } from "./+types/route";

export function Component() {
  const { tags, posts } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="relative">
      <Navbar />
      <SidebarProvider>
        <Suspense
          fallback={
            <ResourcesSidebar className="pt-16" tags={tags} posts={[]} />
          }
        >
          <Await resolve={posts}>
            {(resolvedPosts) => (
              <ResourcesSidebar
                className="pt-16"
                tags={tags}
                posts={resolvedPosts}
              />
            )}
          </Await>
        </Suspense>
        <SidebarInset className="flex flex-col pt-20 relative">
          <SidebarTrigger className="fixed top-20 ml-3 bg-background" />

          <div className={`pr-4 pl-12 pb-12 overflow-auto`}>
            <Outlet />
          </div>

          <Separator className="mb-12" />

          <Footer />
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

import { Link, Outlet, useLoaderData, useMatches } from "react-router";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "~/ui/breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "~/ui/sidebar";
import { Navbar } from "~/components/navbar";
import { Footer } from "~/components/footer";

import { ResourcesSidebar } from "./components/resources-sidebar";

import type { Route } from "./+types/route";

interface BreadcrumbItem {
  title: string;
  href: string | null;
}

interface RouteData {
  breadcrumb?: BreadcrumbItem | BreadcrumbItem[];
  [key: string]: unknown;
}

export function Component() {
  const { categories, posts } =
    useLoaderData<Route.ComponentProps["loaderData"]>();

  const matches = useMatches();

  // Build breadcrumbs from route matches
  const breadcrumbs = matches
    .filter((match): match is typeof match & { data: RouteData } =>
      Boolean(
        match.data &&
          typeof match.data === "object" &&
          "breadcrumb" in match.data,
      ),
    )
    .flatMap((match) => {
      const breadcrumb = match.data.breadcrumb;
      return Array.isArray(breadcrumb)
        ? breadcrumb
        : breadcrumb
          ? [breadcrumb]
          : [];
    })
    .filter((breadcrumb): breadcrumb is BreadcrumbItem =>
      Boolean(
        breadcrumb && typeof breadcrumb === "object" && "title" in breadcrumb,
      ),
    );

  return (
    <div className="relative">
      <Navbar />
      <SidebarProvider>
        <ResourcesSidebar
          className="pt-16"
          categories={categories}
          posts={posts}
        />
        <SidebarInset className="flex flex-col pt-18 relative">
          <SidebarTrigger className="fixed top-20 ml-4 bg-background" />
          <div className="pr-4 pl-16 pb-12">
            {breadcrumbs.length > 0 ? (
              <Breadcrumb className="mb-6 pt-3">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/resources">Resources</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {breadcrumbs.map((breadcrumb, index) => (
                    <div key={index} className="contents">
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {breadcrumb.href ? (
                          <BreadcrumbLink asChild>
                            <Link to={breadcrumb.href}>{breadcrumb.title}</Link>
                          </BreadcrumbLink>
                        ) : (
                          <span>{breadcrumb.title}</span>
                        )}
                      </BreadcrumbItem>
                    </div>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            ) : null}
            <Outlet context={{ categories, posts }} />
          </div>

          <Footer />
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

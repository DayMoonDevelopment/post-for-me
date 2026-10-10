import { Link, useMatches } from "react-router";

import get from "lodash/get";

import { TeamActions } from "./_team-actions";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "~/ui/breadcrumb";
import { Separator } from "~/ui/separator";
import { SidebarTrigger } from "~/ui/sidebar";

type MatchHandle = {
  breadcrumb?: string;
};

export function Header() {
  const matches = useMatches();

  const breadcrumbs = matches
    .filter((match) => {
      const handle = match.handle as MatchHandle;

      return handle?.breadcrumb;
    })
    .map((match) => {
      const handle = match.handle as MatchHandle;

      return {
        name: get(match.loaderData, `${handle?.breadcrumb}`, `${handle?.breadcrumb}`),
        href: match.pathname,
      };
    });

  return (
    <header className="flex h-14 shrink-0 items-center gap-2">
      <div className="flex flex-1 items-center gap-2 px-3">
        <SidebarTrigger />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />

        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((breadcrumb, index) => [
              index > 0 ? (
                <BreadcrumbSeparator key={`breadcrumb-separator-${index}`} />
              ) : null,
              <BreadcrumbItem key={breadcrumb.href}>
                <BreadcrumbLink className="line-clamp-1" asChild>
                  <Link to={breadcrumb.href}>{breadcrumb.name}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>,
            ])}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-auto px-3">
        <TeamActions />
      </div>
    </header>
  );
}

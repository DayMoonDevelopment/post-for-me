import { Link, useLoaderData, useParams } from "react-router";

import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "~/ui/sidebar";

import { PlusSmallIcon } from "~/components/icons";

import { ProjectNavItem } from "./_projects-nav-item";

import type { Route } from "./+types/route";

export function ProjectsNav() {
  const { teamId } = useParams<Route.ComponentProps["params"]>();
  const { projects } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <Link to={`/${teamId}/new`}>
        <SidebarGroupAction title="Create new project">
          <PlusSmallIcon />
          <span className="sr-only">Create new project</span>
        </SidebarGroupAction>
      </Link>
      <SidebarGroupContent>
        <SidebarMenu>
          {projects.map((project) => (
            <ProjectNavItem
              key={project.id}
              projectId={project.id}
              name={project.name}
              teamId={`${teamId}`}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

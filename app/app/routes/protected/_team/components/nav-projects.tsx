import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

import type { Project } from "~/lib/types/project";

import { ModalTrigger } from "~/components/modal";
import { NewProjectModal } from "~/components/new-project";
import { AddIcon } from "~/icons";
import { ProjectTypeIcon } from "~/ui/project-type-badge";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/ui/sidebar";

/**
 * The active team's projects — the way from team context back into a project.
 * The group label carries a {@link SidebarGroupAction} for creating a new one,
 * so the list and the way to extend it sit together.
 *
 * Renders even with no projects: an empty team is exactly when the create
 * action matters most.
 */
export function NavProjects({
  projects,
  teamId,
}: {
  projects: Project[];
  teamId: null | string;
}) {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const newProjectLabel = t("sidebar.switcher.newProject");
  // `top-2.5` centers the action against the h-8 label inside the group's
  // py-1 — the primitive's default `top-3.5` assumes py-2.
  const action = (
    <SidebarGroupAction className="top-2.5" title={newProjectLabel}>
      <AddIcon />
      <span className="sr-only">{newProjectLabel}</span>
    </SidebarGroupAction>
  );

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t("sidebar.groups.projects")}</SidebarGroupLabel>
      {teamId ? (
        <NewProjectModal
          teamId={teamId}
          trigger={<ModalTrigger render={action} />}
        />
      ) : (
        action
      )}
      <SidebarMenu>
        {projects.map((project) => {
          const url = `/projects/${project.id}`;
          // Exact match: the project home highlights, its leaf pages don't (and
          // those render under the `_project` shell anyway).
          const active = pathname === url;
          return (
            <SidebarMenuItem key={project.id}>
              <SidebarMenuButton
                render={<Link to={url} />}
                isActive={active}
                tooltip={project.name}
              >
                {/* The project's TYPE is its identity here — brand-colored, the
                    same glyph the switcher and the type badge use. */}
                <ProjectTypeIcon type={project.type} className="size-4" />
                <span className="truncate">{project.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

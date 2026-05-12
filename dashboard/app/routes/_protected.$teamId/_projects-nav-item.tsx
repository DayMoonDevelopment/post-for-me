import { useState } from "react";
import { Link, Form, useMatches } from "react-router";

import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "~/ui/sidebar";
import { Collapsible, CollapsibleContent } from "~/ui/collapsible";

import { FolderIcon, EllipsisIcon, TrashCanIcon, PencilLineIcon } from "~/components/icons";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "~/ui/dropdown-menu";

function hasMatch(
  matches: ReturnType<typeof useMatches>,
  id: string,
  matchParam: { key: string; value: string },
) {
  return matches.some((match) => {
    if (match.id === id) {
      return match.params[matchParam.key] === matchParam.value;
    }
  });
}

export function ProjectNavItem({
  projectId,
  name,
  teamId,
}: {
  projectId: string;
  name: string;
  teamId: string;
}) {
  const matches = useMatches();
  const isActive = hasMatch(matches, "routes/_protected.$teamId.$projectId", {
    key: "projectId",
    value: projectId,
  });

  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <Form
        method="post"
        action={`/${teamId}/${projectId}/edit`}
        navigate={false}
        onSubmit={() => setIsEditing(false)}
      >
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <div>
              <FolderIcon />

              <input
                name="name"
                defaultValue={name}
                className="border border-input rounded-xs flex-1 px-0.5 mr-1"
                ref={(input) => input?.focus()}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsEditing(false);
                  }
                }}
              />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </Form>
    );
  }

  return (
    <Collapsible open={isActive}>
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <Link
            to={`/${teamId}/${projectId}`}
            prefetch="intent"
            className="flex-1"
          >
            <FolderIcon />
            <span>{name}</span>
          </Link>
        </SidebarMenuButton>

        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <SidebarMenuSubButton
                asChild
                isActive={hasMatch(
                  matches,
                  "routes/_protected.$teamId.$projectId.setup",
                  {
                    key: "projectId",
                    value: projectId,
                  },
                )}
              >
                <Link to={`/${teamId}/${projectId}/setup`}>Setup</Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>

            <SidebarMenuSubItem>
              <SidebarMenuSubButton
                asChild
                isActive={hasMatch(
                  matches,
                  "routes/_protected.$teamId.$projectId.keys",
                  {
                    key: "projectId",
                    value: projectId,
                  },
                )}
              >
                <Link to={`/${teamId}/${projectId}/keys`}>API Keys</Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>

            <SidebarMenuSubItem>
              <SidebarMenuSubButton
                asChild
                isActive={hasMatch(
                  matches,
                  "routes/_protected.$teamId.$projectId.accounts",
                  {
                    key: "projectId",
                    value: projectId,
                  },
                )}
              >
                <Link to={`/${teamId}/${projectId}/accounts`}>
                  Social Media Accounts
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>

            <SidebarMenuSubItem>
              <SidebarMenuSubButton
                asChild
                isActive={hasMatch(
                  matches,
                  "routes/_protected.$teamId.$projectId.posts._index",
                  {
                    key: "projectId",
                    value: projectId,
                  },
                )}
              >
                <Link to={`/${teamId}/${projectId}/posts`}>
                  Social Media Posts
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>

            <SidebarMenuSubItem>
              <SidebarMenuSubButton
                asChild
                isActive={hasMatch(
                  matches,
                  "routes/_protected.$teamId.$projectId.composer",
                  {
                    key: "projectId",
                    value: projectId,
                  },
                )}
              >
                <Link to={`/${teamId}/${projectId}/composer`}>
                  Posting Playground
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </CollapsibleContent>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction showOnHover>
              <EllipsisIcon />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem onSelect={() => setIsEditing(true)}>
              <PencilLineIcon />
              <span>Edit Project</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem variant="destructive" asChild>
              <Link to={`/${teamId}/${projectId}/delete`}>
                <TrashCanIcon />
                <span>Delete Project</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </Collapsible>
  );
}

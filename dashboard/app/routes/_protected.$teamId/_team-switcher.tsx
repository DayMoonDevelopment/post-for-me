import { useState } from "react";
import { Link, useLoaderData } from "react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "~/ui/sidebar";

import { ChevronDownSmallIcon, PlusSmallIcon } from "~/components/icons";

import { CreateTeamModal } from "./_create-team-modal";
import type { Route } from "./+types/route";

export function TeamSwitcher() {
  const { teams, team } = useLoaderData<Route.ComponentProps["loaderData"]>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem className="flex flex-row items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton className="w-fit px-1.5">
                <span className="truncate font-medium">{team.name}</span>
                <ChevronDownSmallIcon className="opacity-50" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-64 rounded-lg"
              align="start"
              side="bottom"
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Teams
              </DropdownMenuLabel>
              {teams.map((team) => (
                <DropdownMenuItem key={team.name} className="gap-2 p-2" asChild>
                  <Link to={`/${team.id}`}>{team.name}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 p-2"
                onSelect={() => setIsCreateModalOpen(true)}
              >
                <div className="bg-background flex size-6 items-center justify-center rounded-md border">
                  <PlusSmallIcon className="size-4" />
                </div>
                <div className="text-muted-foreground font-medium">
                  Create a new team
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <CreateTeamModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </>
  );
}

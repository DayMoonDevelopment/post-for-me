import { Link, Outlet, useLoaderData } from "react-router";

import { Button } from "~/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/table";

import { EllipsisIcon, PersonRemoveIcon, PersonAddIcon } from "~/components/icons";

import type { Route } from "./+types/route";

export function Component() {
  const { members } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="p-4 flex flex-col gap-8">
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-col gap-0.5 pl-1">
          <h1 className="font-semibold">Team members</h1>
          <p className="text-sm text-muted-foreground">
            Invite as many team members as you want, for free!
          </p>
        </div>

        <Button asChild>
          <Link to="add">
            <PersonAddIcon />
            Add team members
          </Link>
        </Button>
      </div>

      <div className="bg-card rounded-sm border shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) =>
              member ? (
                <TableRow key={member.email}>
                  <TableCell className="font-medium pr-8">
                    {member.email}
                  </TableCell>
                  <TableCell>{[member.full_name]}</TableCell>
                  <TableCell className="text-right w-full">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <EllipsisIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56" align="start">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuGroup>
                          <DropdownMenuItem variant="destructive" asChild>
                            <Link to={`remove?user_id=${member.id}`}>
                              <PersonRemoveIcon />
                              {member.isCurrentUser
                                ? "Leave team"
                                : "Remove from team"}
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ) : null,
            )}
          </TableBody>
        </Table>
      </div>

      <Outlet />
    </div>
  );
}

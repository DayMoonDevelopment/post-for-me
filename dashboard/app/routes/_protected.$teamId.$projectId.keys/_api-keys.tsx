import { Link, useLoaderData } from "react-router";
import { EllipsisIcon, TrashCanIcon } from "~/components/icons";

import { cn } from "~/lib/utils";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "~/ui/table";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "~/ui/dropdown-menu";

import type { Route } from "./+types/route";
import { Button } from "~/ui/button";

export function ApiKeys() {
  const { keys } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="bg-card border rounded-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((key) => (
            <TableRow key={key.id}>
              <TableCell>
                <span
                  className={cn(
                    "font-mono bg-muted text-muted-foreground border-muted-foreground/50 rounded-sm px-2 py-1",
                    key.enabled ? "" : "line-through",
                  )}
                >{`${key.start}***`}</span>

                {key.enabled ? null : (
                  <span className="text-muted-foreground/50 text-xs italic ml-2">
                    disabled
                  </span>
                )}
              </TableCell>
              <TableCell>{new Date(key.createdAt).toLocaleString()}</TableCell>
              <TableCell>
                <div className="w-full flex items-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="ml-auto">
                        <EllipsisIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-40">
                      <DropdownMenuItem
                        variant="destructive"
                        className="gap-2"
                        asChild
                      >
                        <Link to={`delete?key_id=${key.id}`}>
                          <TrashCanIcon className="h-4 w-4" />
                          Delete
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}

          {!keys.length ? (
            <TableRow>
              <TableCell>No API keys found</TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

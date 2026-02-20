import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useForm } from "~/hooks/use-form";
import { ArrowUpDownIcon, MoreHorizontalIcon } from "lucide-react";

import { Button } from "~/ui/button";
import { Badge } from "~/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/ui/dialog";

import type { ColumnDef } from "@tanstack/react-table";
import type { PostWithConnections } from "./_types";
import { format } from "date-fns";

function PostActionsCell({ post }: { post: PostWithConnections }) {
  const { fetcher, isSubmitting } = useForm({ key: `delete-post-${post.id}` });
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const canDelete = post.status === "draft" || post.status === "scheduled";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      setIsDeleteOpen(false);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
              e.stopPropagation();
              navigator.clipboard.writeText(post.id);
            }}
          >
            Copy post ID
          </DropdownMenuItem>
          {canDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.stopPropagation();
                  setIsDeleteOpen(true);
                }}
              >
                <span className="text-destructive">Delete post</span>
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={isDeleteOpen}
        onOpenChange={(nextOpen) => {
          if (!isSubmitting) setIsDeleteOpen(nextOpen);
        }}
      >
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete this post?</DialogTitle>
            <DialogDescription>
              This will permanently delete the post. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmitting}
              onClick={() => {
                fetcher.submit(
                  { action: "delete-post", postId: post.id },
                  { method: "POST" }
                );
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function badgeVariant(status: string) {
  switch (status) {
    case "error":
      return "destructive";
    case "posted":
    case "processed":
      return "affirmative";
    default:
      return "secondary";
  }
}

const providerColors = {
  facebook: "bg-blue-500",
  instagram: "bg-pink-500",
  x: "bg-black",
  tiktok: "bg-black",
  youtube: "bg-red-600",
  pinterest: "bg-red-400",
  linkedin: "bg-blue-700",
  bluesky: "bg-sky-500",
  threads: "bg-purple-500",
} as const;

export const columns: ColumnDef<PostWithConnections>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Post ID
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const postId = row.getValue("id") as string;
      return (
        <Link to={postId} className="font-mono hover:underline">
          {postId}
        </Link>
      );
    },
  },
  {
    accessorKey: "external_id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          External ID
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return row.getValue("external_id") as string;
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return <Badge variant={badgeVariant(status)}>{status}</Badge>;
    },
  },
  {
    id: "providers",
    header: "Providers",
    cell: ({ row }) => {
      const post = row.original;
      const providers =
        post.social_accounts?.map((conn) => conn.platform) || [];

      const uniqueProviders = [...new Set(providers)];

      return (
        <div className="flex flex-wrap gap-1">
          {uniqueProviders.map((provider) => (
            <Badge
              key={provider}
              className={`${providerColors[provider as keyof typeof providerColors] || "bg-gray-500"} text-white text-xs`}
            >
              {provider}
            </Badge>
          ))}
          {uniqueProviders.length === 0 ? (
            <span className="text-sm text-muted-foreground">No providers</span>
          ) : null}
        </div>
      );
    },
  },
  {
    id: "accounts",
    header: "# Accounts",
    cell: ({ row }) => {
      const post = row.original;
      const accountCount = post.social_accounts?.length || 0;

      return <div className="font-medium">{accountCount}</div>;
    },
  },
  {
    accessorKey: "caption",
    header: "Caption",
    cell: ({ row }) => {
      const caption = (row.getValue("caption") as string) || "";

      return (
        <div className="font-medium">
          {caption.substring(0, 30)}
          {caption.length > 30 ? "..." : ""}
        </div>
      );
    },
  },
  {
    accessorKey: "scheduled_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Post At
          <ArrowUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("scheduled_at"));
      return <div className="text-sm">{format(date, "MM/dd/yyyy HH:mm")}</div>;
    },
  },
  // {
  //   accessorKey: "created_at",
  //   header: ({ column }) => {
  //     return (
  //       <Button
  //         variant="ghost"
  //         onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
  //       >
  //         Created
  //         <ArrowUpDownIcon className="ml-2 h-4 w-4" />
  //       </Button>
  //     );
  //   },
  //   cell: ({ row }) => {
  //     const date = new Date(row.getValue("created_at"));
  //     return <div className="text-sm">{date.toLocaleDateString()}</div>;
  //   },
  // },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const post = row.original;

      return <PostActionsCell post={post} />;
    },
  },
];

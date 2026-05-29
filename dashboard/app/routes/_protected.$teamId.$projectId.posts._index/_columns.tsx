import { useEffect, useRef, useState } from "react";
import { Link, useRevalidator } from "react-router";
import { ArrowUpDownIcon, MoreHorizontalIcon } from "lucide-react";

import {
  CalendarClock4Icon,
  CheckmarkSmallIcon,
  CircleCheckIcon,
  CrossLargeIcon,
  FileEditIcon,
  LoadingCircleIcon,
  TriangleExclamationIcon,
} from "~/components/icons";

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

import { useForm as useFormFetcher } from "~/hooks/use-form";

import type { ColumnDef } from "@tanstack/react-table";
import type { PostWithConnections } from "./_types";
import { format } from "date-fns";

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

const statusIcons: Partial<
  Record<string, React.FC<{ className?: string }>>
> = {
  draft: FileEditIcon,
  scheduled: CalendarClock4Icon,
  processing: LoadingCircleIcon,
  posting: LoadingCircleIcon,
  processed: CircleCheckIcon,
  posted: CircleCheckIcon,
  failed: TriangleExclamationIcon,
  error: TriangleExclamationIcon,
  cancelled: CrossLargeIcon,
};

const providerColors = {
  facebook: "bg-blue-500",
  instagram: "bg-pink-500",
  x: "bg-black",
  tiktok: "bg-black",
  youtube: "bg-[#FF0000]",
  pinterest: "bg-red-400",
  linkedin: "bg-blue-700",
  bluesky: "bg-sky-500",
  threads: "bg-purple-500",
} as const;

export const columns: ColumnDef<PostWithConnections>[] = [
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Status
            <ArrowUpDownIcon className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const Icon = statusIcons[status];
      return (
        <div className="flex justify-center">
          <Badge variant={badgeVariant(status)} className="capitalize">
            {Icon ? <Icon className="size-3.5" /> : null}
            {status}
          </Badge>
        </div>
      );
    },
  },
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
    id: "providers",
    header: "Providers",
    cell: ({ row }) => {
      const post = row.original;
      const providers =
        post.social_accounts?.map((conn) => conn.platform) || [];

      const uniqueProviders = [...new Set(providers)];

      const providerStatus = post.provider_status;

      return (
        <div className="flex flex-wrap gap-1">
          {uniqueProviders.map((provider) => {
            const status = providerStatus?.[provider];

            return (
              <Badge
                key={provider}
                className={`${providerColors[provider as keyof typeof providerColors] || "bg-gray-500"} text-white text-xs gap-1`}
              >
                {status === undefined ? null : status ? (
                  <CheckmarkSmallIcon className="size-3" />
                ) : (
                  <TriangleExclamationIcon className="size-3" />
                )}
                {provider}
              </Badge>
            );
          })}
          {uniqueProviders.length === 0 ? (
            <span className="text-sm text-muted-foreground">No providers</span>
          ) : null}
        </div>
      );
    },
  },
  {
    id: "account_ids",
    header: "Account IDs",
    cell: ({ row }) => {
      const post = row.original;
      const accountIds = post.social_accounts?.map((account) => account.id) || [];

      if (accountIds.length === 0) {
        return <span className="text-sm text-muted-foreground">No accounts</span>;
      }

      return (
        <div className="flex flex-col gap-1">
          {accountIds.map((accountId) => (
            <span key={accountId} className="font-mono text-xs">
              {accountId}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    id: "account_external_ids",
    header: "Account External IDs",
    cell: ({ row }) => {
      const post = row.original;
      const accounts = post.social_accounts || [];

      if (accounts.length === 0) {
        return <span className="text-sm text-muted-foreground">No accounts</span>;
      }

      return (
        <div className="flex flex-col gap-1">
          {accounts.map((account) => (
            <span key={`${account.id}-external`} className="font-mono text-xs">
              {account.external_id || "-"}
            </span>
          ))}
        </div>
      );
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
      return <PostRowActions post={post} />;
    },
  },
];

function PostRowActions({ post }: { post: PostWithConnections }) {
  const canDelete = post.status === "draft" || post.status === "scheduled";
  const [deleteOpen, setDeleteOpen] = useState(false);
  const revalidator = useRevalidator();

  const { fetcher, isSubmitting } = useFormFetcher({
    withToast: true,
    key: `delete-post-${post.id}`,
  });

  const wasSubmittingRef = useRef(false);
  useEffect(() => {
    if (wasSubmittingRef.current && !isSubmitting) {
      if (fetcher.data?.success) {
        revalidator.revalidate();
      }
      setDeleteOpen(false);
    }
    wasSubmittingRef.current = isSubmitting;
  }, [fetcher.data?.success, isSubmitting, revalidator]);

  return (
    <div data-row-click="ignore" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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
                variant="destructive"
                onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.stopPropagation();
                  setDeleteOpen(true);
                }}
              >
                Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={deleteOpen}
        onOpenChange={(nextOpen) => {
          if (isSubmitting) return;
          setDeleteOpen(nextOpen);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this post?</DialogTitle>
            <DialogDescription>
              This will permanently delete the post. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <fetcher.Form method="post">
            <input type="hidden" name="action" value="delete-post" />
            <input type="hidden" name="postId" value={post.id} />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isSubmitting}>
                {isSubmitting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </fetcher.Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

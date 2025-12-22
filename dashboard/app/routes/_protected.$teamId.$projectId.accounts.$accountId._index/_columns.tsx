import { ArrowUpDown } from "lucide-react";
import { Button } from "~/ui/button";
import { Badge } from "~/ui/badge";
import type { PlatformPost } from "./_types";
import type { ColumnDef } from "@tanstack/react-table";

export type CustomColumnDef<TData, TValue = unknown> = ColumnDef<
  TData,
  TValue
> & {
  label?: string;
};

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

function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return "0s";
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  }
  return `${Math.floor(seconds)}s`;
}

export const columns: CustomColumnDef<PlatformPost>[] = [
  {
    label: "Posted At",
    accessorKey: "posted_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Posted At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = row.getValue("posted_at") as string | undefined;
      if (!date) return <div className="text-muted-foreground">N/A</div>;
      return <div>{new Date(date).toLocaleDateString()}</div>;
    },
  },
  {
    label: "Caption",
    accessorKey: "caption",
    header: "Caption",
    cell: ({ row }) => {
      const caption = row.getValue("caption") as string;
      const truncated =
        caption.length > 50 ? `${caption.slice(0, 50)}...` : caption;
      return (
        <div className="max-w-md" title={caption}>
          {truncated || (
            <span className="text-muted-foreground">No caption</span>
          )}
        </div>
      );
    },
  },
  {
    label: "Platform",
    accessorKey: "platform",
    header: "Platform",
    cell: ({ row }) => {
      const platform = row.getValue("platform") as keyof typeof providerColors;
      return (
        <Badge className={`${providerColors[platform]} text-white`}>
          {platform}
        </Badge>
      );
    },
  },
  {
    label: "Likes",
    accessorKey: "metrics.likes",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Likes
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const likes = row.original.metrics?.likes;
      return <div className="font-medium">{formatNumber(likes)}</div>;
    },
  },
  {
    label: "Comments",
    accessorKey: "metrics.comments",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Comments
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const comments = row.original.metrics?.comments;
      return <div className="font-medium">{formatNumber(comments)}</div>;
    },
  },
  {
    label: "Shares",
    accessorKey: "metrics.shares",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Shares
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const shares = row.original.metrics?.shares;
      return <div className="font-medium">{formatNumber(shares)}</div>;
    },
  },
  {
    label: "Views",
    accessorKey: "metrics.video_views",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Views
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const views =
        row.original.metrics?.video_views ||
        row.original.metrics?.plays ||
        row.original.metrics?.impressions ||
        row.original.metrics?.views ||
        row.original.metrics?.media_views;
      return <div className="font-medium">{formatNumber(views)}</div>;
    },
  },
  {
    label: "Reach",
    accessorKey: "metrics.reach",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Reach
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const reach = row.original.metrics?.reach;
      return <div className="font-medium">{formatNumber(reach)}</div>;
    },
  },
  {
    label: "Watch Time",
    accessorKey: "metrics.total_time_watched",
    header: "Watch Time",
    cell: ({ row }) => {
      const watchTime = row.original.metrics?.total_time_watched;
      return (
        <div className="font-medium text-muted-foreground">
          {watchTime ? formatDuration(watchTime) : "N/A"}
        </div>
      );
    },
  },
  {
    label: "Engagement",
    id: "engagement",
    header: "Engagement",
    cell: ({ row }) => {
      const metrics = row.original.metrics;
      const engagement =
        (metrics?.likes || 0) +
        (metrics?.comments || 0) +
        (metrics?.shares || 0);
      return <div className="font-medium">{formatNumber(engagement)}</div>;
    },
  },
  {
    label: "Platform URL",
    accessorKey: "platform_url",
    header: "Link",
    cell: ({ row }) => {
      const url = row.getValue("platform_url") as string;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          View Post
        </a>
      );
    },
  },
];

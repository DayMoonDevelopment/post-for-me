import { Badge } from "~/ui/badge";
import { DataGridColumnHeader, type DataGridColumnDef } from "~/ui/data-grid";

import type { PlatformPost } from "./_types";
import type { PostMetrics } from "./_types";

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

function getViews(metrics: PostMetrics | undefined): number {
  return (
    metrics?.video_views ||
    metrics?.plays ||
    metrics?.impressions ||
    metrics?.views ||
    metrics?.media_views ||
    0
  );
}

function getEngagement(metrics: PostMetrics | undefined): number {
  return (
    (metrics?.likes || 0) + (metrics?.comments || 0) + (metrics?.shares || 0)
  );
}

export const columns: DataGridColumnDef<PlatformPost>[] = [
  {
    meta: { headerTitle: "Posted At" },
    id: "posted_at",
    accessorFn: (row) => {
      if (!row.posted_at) return 0;
      const d = new Date(row.posted_at);
      return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Posted At" />
    ),
    cell: ({ row }) => {
      const date = row.original.posted_at;
      if (!date) return <div className="text-muted-foreground">N/A</div>;
      return <div>{new Date(date).toLocaleDateString()}</div>;
    },
  },
  {
    meta: { headerTitle: "Caption" },
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
    meta: { headerTitle: "Platform" },
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
    meta: { headerTitle: "Likes" },
    id: "likes",
    accessorFn: (row) => row.metrics?.likes ?? 0,
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Likes" />
    ),
    cell: ({ row }) => {
      const likes = row.getValue("likes") as number;
      return <div className="font-medium">{formatNumber(likes)}</div>;
    },
  },
  {
    meta: { headerTitle: "Comments" },
    id: "comments",
    accessorFn: (row) => row.metrics?.comments ?? 0,
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Comments" />
    ),
    cell: ({ row }) => {
      const comments = row.getValue("comments") as number;
      return <div className="font-medium">{formatNumber(comments)}</div>;
    },
  },
  {
    meta: { headerTitle: "Shares" },
    id: "shares",
    accessorFn: (row) => row.metrics?.shares ?? 0,
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Shares" />
    ),
    cell: ({ row }) => {
      const shares = row.getValue("shares") as number;
      return <div className="font-medium">{formatNumber(shares)}</div>;
    },
  },
  {
    meta: { headerTitle: "Views" },
    id: "views",
    accessorFn: (row) => getViews(row.metrics),
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Views" />
    ),
    cell: ({ row }) => {
      const views = row.getValue("views") as number;
      return <div className="font-medium">{formatNumber(views)}</div>;
    },
  },
  {
    meta: { headerTitle: "Reach" },
    id: "reach",
    accessorFn: (row) => row.metrics?.reach ?? 0,
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Reach" />
    ),
    cell: ({ row }) => {
      const reach = row.getValue("reach") as number;
      return <div className="font-medium">{formatNumber(reach)}</div>;
    },
  },
  {
    meta: { headerTitle: "Watch Time" },
    id: "watch_time",
    accessorFn: (row) => row.metrics?.total_time_watched ?? 0,
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Watch Time" />
    ),
    cell: ({ row }) => {
      const watchTime = row.getValue("watch_time") as number;
      return (
        <div className="font-medium text-muted-foreground">
          {watchTime ? formatDuration(watchTime) : "N/A"}
        </div>
      );
    },
  },
  {
    meta: { headerTitle: "Engagement" },
    id: "engagement",
    accessorFn: (row) => getEngagement(row.metrics),
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Engagement" />
    ),
    cell: ({ row }) => {
      const engagement = row.getValue("engagement") as number;
      return <div className="font-medium">{formatNumber(engagement)}</div>;
    },
  },
  {
    meta: { headerTitle: "Platform URL" },
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

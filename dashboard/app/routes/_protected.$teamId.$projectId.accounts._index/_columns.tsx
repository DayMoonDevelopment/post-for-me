import { MoreHorizontal, User } from "lucide-react";
import { useFetcher, useNavigate, useParams } from "react-router";

import { Button } from "~/ui/button";
import { Badge } from "~/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/ui/dropdown-menu";
import { Switch } from "~/ui/switch";
import { DataGridColumnHeader, type DataGridColumnDef } from "~/ui/data-grid";

import type { SocialConnection } from "./_types";

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

export const columns: DataGridColumnDef<SocialConnection>[] = [
  {
    meta: { headerTitle: "Social Provider Profile Photo Url" },
    accessorKey: "social_provider_profile_photo_url",
    header: "",
    enableSorting: false,
    cell: ({ row }) => {
      const connection = row.original;
      return (
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={connection.social_provider_profile_photo_url || ""}
            alt={connection.social_provider_user_name || "User"}
          />
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      );
    },
  },
  {
    meta: { headerTitle: "Provider" },
    accessorKey: "provider",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Provider" />
    ),
    cell: ({ row }) => {
      const provider = row.getValue("provider") as keyof typeof providerColors;
      return (
        <Badge className={`${providerColors[provider]} text-white`}>
          {provider}
        </Badge>
      );
    },
  },
  {
    meta: { headerTitle: "Social Provider User Name" },
    accessorKey: "social_provider_user_name",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Username" />
    ),
    cell: ({ row }) => {
      const username = row.getValue("social_provider_user_name") as string;
      return <div className="font-medium">{username || "N/A"}</div>;
    },
  },
  {
    meta: { headerTitle: "User Id" },
    accessorKey: "social_provider_user_id",
    header: "User ID",
    cell: ({ row }) => {
      const userId = row.getValue("social_provider_user_id") as string;
      return (
        <div className="font-mono text-sm text-muted-foreground">{userId}</div>
      );
    },
  },
  {
    meta: { headerTitle: "External Id" },
    accessorKey: "external_id",
    header: "External ID",
    cell: ({ row }) => {
      const externalId = row.getValue("external_id") as string;
      return (
        <div className="font-mono text-sm text-muted-foreground">
          {externalId || "N/A"}
        </div>
      );
    },
  },
  {
    meta: { headerTitle: "Status" },
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <div className="font-mono text-sm text-muted-foreground">{status}</div>
      );
    },
  },
  {
    meta: { headerTitle: "Created At" },
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Connected" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return <div>{date.toLocaleDateString()}</div>;
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const connection = row.original;
      const fetcher = useFetcher();
      const navigate = useNavigate();
      const params = useParams();

      const isSubmitting = fetcher.state === "submitting";
      const isConnected = connection.status === "connected";

      const handleDisconnectConnection = () => {
        navigate("disconnect", {
          state: {
            connection: {
              id: connection.id,
              provider: connection.provider,
              social_provider_user_name: connection.social_provider_user_name,
            },
          },
        });
      };

      const handleDeleteConnection = () => {
        navigate("delete", {
          state: {
            connection: {
              id: connection.id,
              provider: connection.provider,
              social_provider_user_name: connection.social_provider_user_name,
            },
          },
        });
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(connection.id)}
            >
              Copy connection ID
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                navigate(
                  `/${params.teamId}/${params.projectId}/accounts/${row.original.id}`,
                );
              }}
            >
              View Account Feed
            </DropdownMenuItem>
            {isConnected ? (
              <DropdownMenuItem onClick={handleDisconnectConnection}>
                <span className="text-red-600">Disconnect Account</span>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={handleDeleteConnection}>
              <span className="text-red-600">Delete Account</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={connection.isTestUser || false}
                  disabled={isSubmitting}
                  onCheckedChange={(checked) => {
                    fetcher.submit(
                      {
                        action: checked ? "mark-test-user" : "unmark-test-user",
                        connectionId: connection.id,
                      },
                      {
                        method: "POST",
                      },
                    );
                  }}
                />
                <span>Test User</span>
                {connection.isTestUser ? (
                  <Badge variant="secondary" className="text-xs">
                    Test
                  </Badge>
                ) : null}
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

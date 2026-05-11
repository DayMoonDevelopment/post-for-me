import { Link, useLoaderData, useParams } from "react-router";

import {
  SignOutIcon,
  ArrowUpRightIcon,
  PersonCircleIcon,
  ReceiptBillIcon,
  RescueRingIcon,
} from "~/components/icons";

import { AccountDialog } from "~/components/account-dialog";

import { Badge } from "~/ui/badge";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from "~/ui/sidebar";

import type { Route } from "./+types/route";

export function UserActions() {
  const { teamId } = useParams();
  const { billing } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <AccountDialog>
              <SidebarMenuButton size="sm">
                <PersonCircleIcon className="h-4 w-4" />
                <span>Account</span>
              </SidebarMenuButton>
            </AccountDialog>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild size="sm">
              <Link to={`/${teamId}/billing`} prefetch="render">
                <ReceiptBillIcon />
                <span>Billing</span>
              </Link>
            </SidebarMenuButton>

            {billing.active ? null : (
              <SidebarMenuBadge>
                <Badge variant="secondary">Set up</Badge>
              </SidebarMenuBadge>
            )}
          </SidebarMenuItem>

          {/* <SidebarMenuItem>
            <SidebarMenuButton asChild size="sm">
              <Link to={`https://postforme.dev/docs`} target="_blank">
                <RescueRingIcon />
                <span className="w-full">Help</span>
                <ArrowUpRightIcon className="text-muted-foreground" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem> */}

          <SidebarMenuItem>
            <SidebarMenuButton asChild size="sm">
              <Link to={`https://api.postforme.dev/docs`} target="_blank">
                <RescueRingIcon />
                <span className="w-full">API docs</span>
                <ArrowUpRightIcon className="text-muted-foreground" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild size="sm" variant="muted">
              <Link to="/logout">
                <SignOutIcon />
                <span>Log out</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

import { usePostHog } from "posthog-js/react";
import { useTranslation } from "react-i18next";
import { Form } from "react-router";

import {
  AccountIcon,
  ExpandIcon,
  LogoutIcon,
  NotificationsIcon,
} from "~/icons";
import { Avatar, AvatarFallback, AvatarImage } from "~/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/ui/sidebar";

import type { NavUserData } from "./nav-user-data";

/** Two-letter initials for the current-user fallback. */
function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return value.slice(0, 2).toUpperCase();
}

/**
 * The signed-in user's avatar — the raw {@link Avatar} primitive (NOT the
 * `UserAvatar` component, which is reserved for social ACCOUNTS). Photo, else
 * initials, else a person glyph; the `prominent` sidebar-primary fill.
 */
function CurrentUserAvatar({ user }: { user: NavUserData }) {
  const label = user.name || user.email;
  return (
    <Avatar size="default">
      {user.avatar ? <AvatarImage src={user.avatar} alt={label} /> : null}
      <AvatarFallback className="bg-sidebar-primary font-medium text-sidebar-primary-foreground uppercase [&_svg]:size-3/5">
        {label ? initials(label) : <AccountIcon aria-hidden />}
      </AvatarFallback>
    </Avatar>
  );
}

export function NavUser({ user }: { user: NavUserData }) {
  const { t } = useTranslation();
  const { isMobile } = useSidebar();
  const posthog = usePostHog();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
              />
            }
          >
            <CurrentUserAvatar user={user} />
            <div className="grid flex-1 text-start text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
            <ExpandIcon className="ms-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--anchor-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "inline-end"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                <CurrentUserAvatar user={user} />
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <AccountIcon />
                {t("sidebar.user.account")}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <NotificationsIcon />
                {t("sidebar.user.notifications")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <Form method="post" action="/logout">
              <DropdownMenuItem
                render={
                  <button
                    type="submit"
                    className="w-full"
                    onClick={() => posthog?.reset()}
                  />
                }
              >
                <LogoutIcon />
                {t("sidebar.user.logout")}
              </DropdownMenuItem>
            </Form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

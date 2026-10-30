import { usePostHog } from "posthog-js/react";
import { useTranslation } from "react-i18next";
import { Form, useFetcher, useRouteLoaderData } from "react-router";

import type { loader as rootLoader } from "~/root";

import {
  AccountIcon,
  ExpandIcon,
  LogoutIcon,
  NotificationsIcon,
  ThemeDarkIcon,
  ThemeLightIcon,
  ThemeSystemIcon,
} from "~/icons";
import { resolveThemeIsDark, type ThemePreference } from "~/lib/theme/config";
import { Avatar, AvatarFallback, AvatarImage } from "~/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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

/**
 * Light/Dark/System submenu — nested rather than top-level since it's a
 * secondary preference, not an account action. Reads the current preference
 * from the root loader (set from the `theme` cookie); on selection it
 * optimistically flips `.dark` on `<html>` before the fetcher's POST to
 * `/api/theme` round-trips, so the switch feels instant.
 */
function ThemeMenu() {
  const { t } = useTranslation();
  const rootData = useRouteLoaderData<typeof rootLoader>("root");
  const theme = rootData?.theme ?? "system";
  const fetcher = useFetcher();

  function handleValueChange(value: unknown) {
    const preference = value as ThemePreference;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    document.documentElement.classList.toggle(
      "dark",
      resolveThemeIsDark(preference, prefersDark),
    );
    fetcher.submit(
      { theme: preference },
      { method: "post", action: "/api/theme" },
    );
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <ThemeSystemIcon />
        {t("sidebar.user.theme.label")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup value={theme} onValueChange={handleValueChange}>
          <DropdownMenuRadioItem value="light">
            <ThemeLightIcon />
            {t("sidebar.user.theme.light")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <ThemeDarkIcon />
            {t("sidebar.user.theme.dark")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <ThemeSystemIcon />
            {t("sidebar.user.theme.system")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
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
            <DropdownMenuGroup>
              <ThemeMenu />
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

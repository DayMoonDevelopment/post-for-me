import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

import type { TranslationKey } from "~/lib/i18n/config";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/ui/sidebar";

export type NavItem = {
  icon: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
  /** When set, the item renders as a button and runs this instead of navigating. */
  onSelect?: () => void;
  /** i18n key for the item label. */
  titleKey: TranslationKey;
  /** Destination for link items. Omit for action items (see `onSelect`). */
  url?: string;
};

/** A labeled group of single-level nav links — the unit every app shell's
 * sidebar builds its nav from, whatever context that shell is in. */
export function NavSection({
  labelKey,
  items,
}: {
  items: NavItem[];
  labelKey?: TranslationKey;
}) {
  const { t } = useTranslation();

  return (
    <SidebarGroup>
      {labelKey ? <SidebarGroupLabel>{t(labelKey)}</SidebarGroupLabel> : null}
      <SidebarMenu>
        {items.map((item) => (
          <NavSectionItem key={item.titleKey} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function NavSectionItem({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  // Exact match so the project home (`/projects/$id`) and its leaf pages
  // (`/projects/$id/settings`) don't both highlight.
  const isLink = !item.onSelect && !!item.url && item.url !== "#";
  const active = item.isActive ?? (isLink && pathname === item.url);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={navItemElement(item)}
        isActive={active}
        tooltip={t(item.titleKey)}
      >
        <item.icon className="size-4" />
        <span>{t(item.titleKey)}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/**
 * The element the sidebar button renders into: an action button, a client-side
 * `Link` for a real destination, or a plain anchor for not-yet-built "#"
 * placeholders. Early returns rather than nested ternaries.
 */
function navItemElement(item: NavItem): React.ReactElement {
  if (item.onSelect) {
    return <button type="button" onClick={item.onSelect} />;
  }
  if (item.url && item.url !== "#") {
    return <Link to={item.url} />;
  }
  return <a href={item.url ?? "#"} />;
}

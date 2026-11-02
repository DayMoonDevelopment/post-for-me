import * as React from "react";
import { useTranslation } from "react-i18next";

import type { TranslationKey } from "~/lib/i18n/config";

import { DiscordIcon, DocsIcon, ExternalLinkIcon } from "~/icons";
import {
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/ui/sidebar";

type ExternalLink = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** i18n key for the link label. */
  titleKey: TranslationKey;
};

// Outbound links — replace the hrefs with the real docs/community URLs.
const links: ExternalLink[] = [
  { titleKey: "sidebar.external.apiDocs", href: "https://docs.postforme.dev", icon: DocsIcon },
  { titleKey: "sidebar.external.discord", href: "https://discord.gg/postforme", icon: DiscordIcon },
];

export function NavExternal() {
  const { t } = useTranslation();

  return (
    <SidebarGroupContent>
      <SidebarMenu>
        {links.map((link) => (
          <SidebarMenuItem key={link.titleKey}>
            <SidebarMenuButton
              render={<a href={link.href} target="_blank" rel="noreferrer" />}
              tooltip={t(link.titleKey)}
            >
              <link.icon className="size-4" />
              <span>{t(link.titleKey)}</span>
              <ExternalLinkIcon className="ms-auto size-3.5 text-sidebar-foreground/60" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  );
}

import type { ComponentType } from "react";

import type { IconProps } from "~/icons";

import * as Icons from "~/icons";

import { Section } from "./section";

/**
 * The icon registry, grouped the same way `app/icons/index.tsx` is. This grid is
 * the visual index of "what semantic icons exist" — the icon equivalent of
 * browsing the i18n locale file.
 */
const GROUPS: { names: (keyof typeof Icons)[]; title: string; }[] = [
  {
    title: "Actions",
    names: [
      "AddIcon", "EditIcon", "DeleteIcon", "SendIcon", "ExternalLinkIcon",
      "LogoutIcon", "MoreIcon", "SearchIcon", "DisconnectIcon", "CopyIcon",
      "FilterIcon", "ExpandIcon", "ChevronLeftIcon",
    ],
  },
  {
    title: "Status / feedback",
    names: [
      "SuccessIcon", "SuccessSolidIcon", "CheckIcon", "WarningIcon",
      "InfoIcon", "HelpIcon",
    ],
  },
  {
    title: "Post lifecycle status",
    names: ["DraftIcon", "ScheduleIcon"],
  },
  {
    title: "Content / media",
    names: ["MediaIcon", "VideoIcon", "PlayIcon", "TextIcon"],
  },
  {
    title: "Navigation / feature areas",
    names: [
      "HomeIcon", "PostsIcon", "SocialAccountsIcon", "ApiKeysIcon",
      "WebhooksIcon", "PlaygroundIcon", "SettingsIcon", "BillingIcon",
      "NotificationsIcon", "DocsIcon", "DiscordIcon", "DebugIcon",
      "AccountIcon", "ProjectIcon", "ProjectActiveIcon",
    ],
  },
  {
    title: "Theme / appearance",
    names: ["ThemeLightIcon", "ThemeDarkIcon", "ThemeSystemIcon"],
  },
  {
    title: "Domain / segmentation",
    names: ["IntegrationIcon", "DeveloperIcon", "MarketingIcon", "AiAgentIcon"],
  },
  {
    title: "Multi-intent glyphs",
    names: ["RocketIcon", "TagIcon"],
  },
  {
    title: "Structural / form primitives",
    names: [
      "CloseIcon", "ChevronRightIcon", "MinusIcon", "CheckSmallIcon",
      "SidebarToggleIcon", "LoadingIcon", "EyeIcon", "EyeOffIcon",
    ],
  },
  {
    title: "Data grid / table structural",
    names: [
      "ChevronDownIcon", "ChevronUpIcon", "ArrowUpIcon", "ArrowDownIcon",
      "ArrowLeftIcon", "ArrowRightIcon", "CornerDownRightIcon", "GlobeIcon",
      "ExchangeIcon", "ArrowToLineLeftIcon", "ArrowToLineRightIcon", "SlidersIcon",
      "UnpinIcon", "CirclePlusIcon", "AlertCircleIcon",
    ],
  },
  {
    title: "Brand marks",
    names: ["PostForMeIcon"],
  },
];

function IconCell({ name }: { name: keyof typeof Icons }) {
  const Glyph = Icons[name] as ComponentType<IconProps>;
  return (
    <div className="flex w-24 flex-col items-center gap-2 rounded-md border p-3 text-center">
      <Glyph className="size-5" aria-hidden />
      <span className="text-[10px] leading-tight text-muted-foreground">{name}</span>
    </div>
  );
}

export function IconsDemo() {
  return (
    <div className="space-y-8">
      {GROUPS.map((group) => (
        <Section key={group.title} title={group.title}>
          {group.names.map((name) => (
            <IconCell key={name} name={name} />
          ))}
        </Section>
      ))}
    </div>
  );
}

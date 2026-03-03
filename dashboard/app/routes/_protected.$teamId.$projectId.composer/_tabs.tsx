import {
  TikTokIcon,
  LinkedInIcon,
  BlueskyIcon,
  FacebookIcon,
  InstagramIcon,
  XIcon,
  PinterestIcon,
  ThreadsIcon,
} from "icons";

import { YouTubeImageIcon } from "~/components/youtube-icon";

import {
  Tabs as TabsContainer,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/ui/tabs";

import { TabTikTok } from "./_tab-tiktok";
import { TabPinterest } from "./_tab-pinterest";
import { TabInstagram } from "./_tab-instagram";
import { TabTwitter } from "./_tab-twitter";
import { TabYouTube } from "./_tab-youtube";
import { TabFacebook } from "./_tab-facebook";
import { TabLinkedIn } from "./_tab-linkedin";
import { TabBluesky } from "./_tab-bluesky";
import { TabThreads } from "./_tab-threads";

import type { Platform } from "./types";

const PLATFORMS: Platform[] = [
  {
    key: "tiktok",
    label: "TikTok",
    icon: TikTokIcon,
    tab: TabTikTok,
  },
  {
    key: "pinterest",
    label: "Pinterest",
    icon: PinterestIcon,
    tab: TabPinterest,
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: InstagramIcon,
    tab: TabInstagram,
  },
  {
    key: "x",
    label: "X (Twitter)",
    icon: XIcon,
    tab: TabTwitter,
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: YouTubeImageIcon,
    tab: TabYouTube,
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: FacebookIcon,
    tab: TabFacebook,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: LinkedInIcon,
    tab: TabLinkedIn,
  },
  {
    key: "bluesky",
    label: "Bluesky",
    icon: BlueskyIcon,
    tab: TabBluesky,
  },
  {
    key: "threads",
    label: "Threads",
    icon: ThreadsIcon,
    tab: TabThreads,
  },
];

export function Tabs() {
  return (
    <TabsContainer defaultValue={PLATFORMS[0].key} className="">
      <TabsList className="h-auto w-full min-w-0 rounded-none border-b bg-transparent p-0 flex overflow-x-auto flex-nowrap scrollbar-hidden justify-start">
        {PLATFORMS.map((platform) => (
          <TabsTrigger
            key={platform.key}
            value={platform.key}
            className="data-[state=active]:after:bg-primary relative rounded-none py-2 px-3 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex-shrink-0"
          >
            <platform.icon className="size-4 mr-1 inline-block" />
            {platform.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {PLATFORMS.map((platform) => (
        <TabsContent key={platform.key} value={platform.key} className="pt-4">
          <platform.tab />
        </TabsContent>
      ))}
    </TabsContainer>
  );
}

import {
  IconDiscord,
  IconFileTextDefault,
  IconGithub,
} from "@central-icons/outlined";

import type { NavigationConfig } from "./types";

export const navigationConfig: NavigationConfig = {
  menuItems: [
    {
      type: "dropdown",
      label: "Solutions",
      fallbackHref: "/solutions",
      visibility: { desktop: true, mobile: true },
    },
    {
      type: "link",
      label: "Integrations",
      href: "/integrations",
      visibility: { desktop: true, mobile: true },
    },
    {
      type: "link",
      label: "Pricing",
      href: "/pricing",
      visibility: { desktop: true, mobile: true },
    },
    {
      type: "dropdown",
      label: "Resources",
      fallbackHref: "/resources",
      visibility: { desktop: true, mobile: true },
    },
    {
      type: "link",
      label: "Blog",
      href: "/blog",
      visibility: { desktop: true, mobile: true },
    },
    {
      type: "link",
      label: "Developers",
      href: "/developers",
      visibility: { desktop: true, mobile: true },
    },
  ],
  socialLinks: [
    {
      label: "GitHub",
      href: "https://github.com/DayMoonDevelopment/post-for-me",
      icon: IconGithub,
      visibility: { desktop: true, mobile: true },
    },
    {
      label: "Discord",
      href: "https://discord.gg/Nv6xEZ2vP5",
      icon: IconDiscord,
      visibility: { desktop: true, mobile: true },
    },
  ],
  actions: [
    {
      label: "Get Started",
      href: "https://app.postforme.dev",
      target: "_blank",
      visibility: { desktop: true, mobile: false },
      variant: "primary",
    },
    {
      label: "API Docs",
      href: "https://api.postforme.dev/docs",
      icon: IconFileTextDefault,
      visibility: { desktop: true, mobile: true },
      variant: "outline",
    },
  ],
  resources: {
    maxPreviewItems: 5,
    viewAllText: "All Resources →",
    viewAllDescription:
      "Check out all of our guides to get started immediately!",
  },
  solutions: {
    maxPreviewItems: 5,
    viewAllText: "All Solutions →",
    viewAllDescription:
      "Explore all solutions to find the perfect fit for your use case!",
  },
};

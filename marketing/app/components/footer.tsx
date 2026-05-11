import { Link } from "~/components/link";
import { Logo } from "~/components/logo";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/ui/accordion";

import { GetStarted } from "./get-started";

import type { ResourcePreview } from "~/components/navigation/types";

const getFooterSections = (resources: ResourcePreview[] = []) => [
  {
    title: "Product",
    links: [
      {
        title: "Overview",
        href: "/",
      },
      {
        title: "About",
        href: "/about",
      },
      {
        title: "Day Moon Development",
        href: "/day-moon-development",
      },
      {
        title: "Pricing",
        href: "/pricing",
      },
      {
        title: "Frequently Asked Questions",
        href: "/faq",
      },
      {
        title: "API Documentation",
        href: "https://api.postforme.dev/docs",
      },
    ],
  },
  {
    title: "Integrations",
    links: [
      {
        title: "TikTok",
        href: "/integrations/tiktok",
      },
      {
        title: "Facebook",
        href: "/integrations/facebook",
      },
      {
        title: "Instagram",
        href: "/integrations/instagram",
      },
      {
        title: "X (Twitter)",
        href: "/integrations/x",
      },
      {
        title: "LinkedIn",
        href: "/integrations/linkedin",
      },
      {
        title: "Pinterest",
        href: "/integrations/pinterest",
      },
      {
        title: "Bluesky",
        href: "/integrations/bluesky",
      },
      {
        title: "Threads",
        href: "/integrations/threads",
      },
      {
        title: "YouTube",
        href: "/integrations/youtube",
      },
    ],
  },
  {
    title: "Solutions",
    links: [
      {
        title: "Social Media Scheduler",
        href: "/solutions/social-media-scheduler",
      },
      {
        title: "AI Content Generation",
        href: "/solutions/ai-content-generation",
      },
      {
        title: "Multi-Account Management",
        href: "/solutions/multi-account-management",
      },
      {
        title: "Games",
        href: "/solutions/games",
      },
      {
        title: "SaaS Products",
        href: "/solutions/saas-products",
      },
      {
        title: "E-Commerce Platforms",
        href: "/solutions/e-commerce-platforms",
      },
      {
        title: "Influencer Management",
        href: "/solutions/influencer-management",
      },
      {
        title: "CRM Systems",
        href: "/solutions/crm-systems",
      },
      {
        title: "DAM Tools",
        href: "/solutions/dam-tools",
      },
      {
        title: "News & Media Publishers",
        href: "/solutions/news-media-publishers",
      },
      {
        title: "Event Management",
        href: "/solutions/event-management",
      },
    ],
  },
  ...(resources.length > 0
    ? [
        {
          title: "Resources",
          links: [
            ...resources.map((resource) => ({
              title: resource.title,
              href: resource.href,
            })),
          ],
        },
      ]
    : []),
  {
    title: "Comparisons",
    links: [
      { title: "vs. Buffer", href: "/compare/buffer" },
      { title: "vs. Hootsuite", href: "/compare/hootsuite" },
      { title: "vs. Ayrshare", href: "/compare/ayrshare" },
      { title: "vs. Zernio", href: "/compare/zernio" },
      { title: "vs. Upload-Post", href: "/compare/upload-post" },
      { title: "vs. Outstand", href: "/compare/outstand" },
      { title: "vs. Postplanify", href: "/compare/postplanify" },
      { title: "All Comparisons", href: "/compare" },
    ],
  },
  {
    title: "Connect",
    links: [
      {
        title: "X (Twitter)",
        href: "https://x.com/postforme_dev",
      },
      {
        title: "GitHub",
        href: "https://github.com/DayMoonDevelopment/post-for-me",
      },
      {
        title: "Discord",
        href: "https://discord.gg/Nv6xEZ2vP5",
      },
    ],
  },
  {
    title: "Legal",
    links: [
      {
        title: "Terms",
        href: "/terms",
      },
      {
        title: "Privacy",
        href: "/privacy",
      },
      {
        title: "Contact",
        href: "/contact",
      },
    ],
  },
];

export const Footer = ({
  resources = [],
}: {
  resources?: ResourcePreview[];
}) => {
  const footerSections = getFooterSections(resources);

  return (
    <div className="space-y-12">
      <div className="px-4">
        <GetStarted />
      </div>

      <footer className="border-t">
        <div className="max-w-(--breakpoint-2xl) mx-auto flex flex-col-reverse xl:flex-row justify-between gap-8 xl:pt-12 pb-8">
          <div className="flex flex-col justify-start gap-x-2 gap-y-4 px-4 sm:px-6 lg:px-8 xl:pt-0 pt-6">
            {/* Logo */}
            <Logo className="h-6 self-start" />

            {/* Copyright */}
            <span className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()}{" "}
              <Link to="/" target="_blank">
                Day Moon Development
              </Link>
              . <br />
              All rights reserved.
            </span>
          </div>

          {/* Desktop Grid Layout */}
          <div className="hidden flex-1 justify-end grid-cols-6 xl:grid-cols-7 gap-x-6 gap-y-8 px-4 sm:px-6 lg:px-8 xl:grid">
            {footerSections.map(({ title, links }) => (
              <div key={title}>
                <h3 className="text-sm font-medium">{title}</h3>
                <ul className="mt-4 space-y-3">
                  {links.map(({ title, href }) => (
                    <li key={title}>
                      <Link
                        to={href}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        {title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Mobile Accordion Layout */}
          <div className="xl:hidden flex-1 px-4 sm:px-6">
            <Accordion type="multiple" className="w-full">
              {footerSections.map(({ title, links }) => (
                <AccordionItem key={title} value={title}>
                  <AccordionTrigger className="hover:no-underline py-4 text-base font-medium text-foreground">
                    {title}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <ul className="space-y-3">
                      {links.map(({ title, href }) => (
                        <li key={title}>
                          <Link
                            to={href}
                            className="text-muted-foreground hover:text-foreground block py-1 text-sm"
                          >
                            {title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </footer>
    </div>
  );
};

import { Link } from "react-router";

import { Logo } from "~/components/logo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/ui/accordion";

import { GetStarted } from "./get-started";
import type { ResourcePreview } from "~/components/nav-menu";

const getFooterSections = (resources: ResourcePreview[] = []) => [
  {
    title: "Product",
    links: [
      {
        title: "Overview",
        href: "/",
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
    title: "Social",
    links: [
      {
        title: "X (Twitter)",
        href: "https://x.com/postforme_dev",
      },
      {
        title: "GitHub",
        href: "https://github.com/DayMoonDevelopment/post-for-me",
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
        <div className="max-w-(--breakpoint-2xl) mx-auto flex flex-col-reverse sm:flex-row justify-between gap-8 sm:pt-6 lg:pt-12 pb-8">
          <div className="flex flex-col justify-start gap-x-2 gap-y-4 px-4 sm:px-6 lg:px-8">
            {/* Logo */}
            <Logo className="h-6 lg:h-8 self-start" />

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
          <div className="hidden flex-1 justify-end grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-8 gap-y-10 px-4 sm:px-6 lg:px-8 md:grid">
            {footerSections.map(({ title, links }) => (
              <div key={title}>
                <h6 className="font-medium">{title}</h6>
                <ul className="mt-6 space-y-4">
                  {links.map(({ title, href }) => (
                    <li key={title}>
                      <Link
                        to={href}
                        className="text-muted-foreground hover:text-foreground"
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
          <div className="md:hidden flex-1 px-4 sm:px-6">
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

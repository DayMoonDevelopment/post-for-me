import type { MetaDescriptor } from "react-router";
import type { Route } from "./+types/route";

/**
 * Base meta for all resources pages.
 * Provides site-wide defaults and breadcrumb structured data.
 */
export const meta: Route.MetaFunction = ({ matches }) => {
  const siteUrl = "https://postfor.me";
  const siteName = "Post For Me";

  // Build breadcrumbs from route matches
  const breadcrumbs = [{ title: "Resources", href: "/resources" }];

  // Collect breadcrumbs from child routes
  matches.forEach((match) => {
    if (
      match &&
      match.data &&
      typeof match.data === "object" &&
      "breadcrumb" in match.data
    ) {
      const breadcrumb = (match.data as any).breadcrumb;
      if (Array.isArray(breadcrumb)) {
        breadcrumbs.push(...breadcrumb);
      } else if (breadcrumb) {
        breadcrumbs.push(breadcrumb);
      }
    }
  });

  // Generate structured data for breadcrumbs
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.title,
      ...(crumb.href && { item: `${siteUrl}${crumb.href}` }),
    })),
  };

  return [
    // Base site metadata
    { property: "og:site_name", content: siteName },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: "@postforme" },

    // Default keywords for all resources
    {
      name: "keywords",
      content:
        "social media API, posting API, scheduling API, developer social API, TikTok API, Instagram API, Facebook API, X API, LinkedIn API",
    },

    // Theme and icons
    { name: "theme-color", content: "#000000" },
    { tagName: "link", rel: "icon", href: "/favicon.ico" },

    // Breadcrumb structured data
    { "script:ld+json": breadcrumbStructuredData },
  ] as MetaDescriptor[];
};

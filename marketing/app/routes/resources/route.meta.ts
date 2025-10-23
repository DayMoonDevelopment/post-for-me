import type { MetaDescriptor } from "react-router";
import type { Route } from "./+types/route";

/**
 * Breadcrumb item interface
 */
interface BreadcrumbItem {
  title: string;
  href: string | null;
}

/**
 * Type guard to check if data has breadcrumb property
 */
function hasBreadcrumb(
  data: unknown,
): data is { breadcrumb: BreadcrumbItem | BreadcrumbItem[] } {
  return (
    typeof data === "object" &&
    data !== null &&
    "breadcrumb" in data &&
    data.breadcrumb !== null &&
    typeof data.breadcrumb === "object"
  );
}

/**
 * Base meta for all resources pages.
 * Provides site-wide defaults and breadcrumb structured data.
 */
export const meta: Route.MetaFunction = ({ matches }) => {
  const siteName = "Post For Me";

  // Build breadcrumbs from route matches
  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Resources", href: "/resources" },
  ];

  // Collect breadcrumbs from child routes with proper typing
  matches.forEach((match) => {
    if (match && hasBreadcrumb(match.data)) {
      const breadcrumb = match.data.breadcrumb;
      if (Array.isArray(breadcrumb)) {
        breadcrumbs.push(...breadcrumb);
      } else {
        breadcrumbs.push(breadcrumb);
      }
    }
  });

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
  ] as MetaDescriptor[];
};

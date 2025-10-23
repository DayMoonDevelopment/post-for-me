import type { MetaDescriptor } from "react-router";
import type { Route } from "./+types/route";

/**
 * Meta function for the main Resources index page.
 * Returns page-specific SEO that will layer on top of parent meta.
 */
export const meta: Route.MetaFunction = ({ data }): MetaDescriptor[] => {
  if (!data) return [];

  const seo = data.seo_meta ?? {};
  const siteUrl = data.siteUrl || "https://postfor.me";

  // Page-specific meta
  const title = seo.title || data.title || "Resources";
  const description = seo.description || data.summary || "Browse our comprehensive guides and documentation for integrating Post for Me into your app or service.";
  const canonical = `${siteUrl}/resources`;

  // Social images
  const imageBase = `${siteUrl}/og-image`;
  const ogImage = `${imageBase}-16x9.png`;

  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: canonical },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonical },
    { property: "og:image", content: ogImage },
    { property: "og:image:alt", content: `${title} - Post For Me` },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ];
};
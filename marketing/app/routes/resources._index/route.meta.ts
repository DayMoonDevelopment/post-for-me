import type { MetaDescriptor } from "react-router";
import type { Route } from "./+types/route";
import { buildResourcesBreadcrumbs, generateBreadcrumbStructuredData, mergeMetaArrays } from "~/lib/utils";

/**
 * Meta function for the main Resources index page.
 * Returns page-specific SEO that will layer on top of parent meta.
 */
export const meta: Route.MetaFunction = ({
  data,
  matches,
}): MetaDescriptor[] => {
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

  // Collect all meta from parent routes
  const parentMeta: MetaDescriptor[] = matches
    .flatMap((match) => {
      if (match && match.meta && Array.isArray(match.meta)) {
        return match.meta;
      }
      return [];
    })
    .filter((meta): meta is MetaDescriptor => Boolean(meta));

  const indexMeta: MetaDescriptor[] = [
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

  // Generate breadcrumbs and add structured data
  const breadcrumbs = buildResourcesBreadcrumbs();
  const breadcrumbStructuredData = generateBreadcrumbStructuredData(breadcrumbs, siteUrl);

  indexMeta.push({
    "script:ld+json": breadcrumbStructuredData
  } as MetaDescriptor);

  // Use deep merge to prioritize higher index elements and filter duplicates
  return mergeMetaArrays(parentMeta, indexMeta);
};
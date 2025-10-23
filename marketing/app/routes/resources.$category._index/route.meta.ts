import type { MetaDescriptor } from "react-router";
import type { Route } from "./+types/route";

/**
 * Meta function for category pages.
 * Returns category-specific SEO that will layer on top of parent meta.
 */
export const meta: Route.MetaFunction = ({ data }): MetaDescriptor[] => {
  if (!data) return [];

  const seo = data.seo_meta ?? {};
  const siteUrl = data.siteUrl || "https://postfor.me";
  const category = data.category;

  // Category-specific meta
  const title = seo.title || data.title || category?.name || "Category";
  const description = seo.description || data.summary || category?.description || `Browse all articles in the ${category?.name} category.`;
  const canonical = `${siteUrl}/resources/${data.slug || category?.slug}`;

  // Social images
  const imageBase = `${siteUrl}/og-image`;
  const ogImage = `${imageBase}-16x9.png`;

  const meta: MetaDescriptor[] = [
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

  // Add category-specific keywords
  if (category?.name) {
    meta.push({
      name: "keywords",
      content: `${category.name}, ${category.name} API, ${category.name} integration, social media API, posting API, scheduling API`
    });
  }

  return meta;
};
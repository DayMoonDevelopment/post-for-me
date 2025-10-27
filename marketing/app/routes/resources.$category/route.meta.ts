import type { MetaDescriptor } from "react-router";
import type { Route } from "./+types/route";
import { MetadataComposer } from "~/lib/meta";
import { buildResourcesBreadcrumbs } from "~/lib/utils";

/**
 * Meta function for category pages.
 * Uses automatic metadata generation from shared properties.
 */
export const meta: Route.MetaFunction = ({ data }): MetaDescriptor[] => {
  if (!data) return [];

  const siteUrl = data.siteUrl || "https://postfor.me";
  const categorySlug = data.categorySlug;

  // Category-specific meta
  const title = `${categorySlug} - Resources`;
  const description = `Browse all articles in the ${categorySlug} category.`;
  const canonical = `${siteUrl}/resources/${categorySlug}`;

  const metadata = new MetadataComposer();
  metadata.siteUrl = siteUrl;
  metadata.title = title;
  metadata.description = description;
  metadata.canonical = canonical;
  metadata.contentType = "website";
  metadata.keywords = `${categorySlug}, ${categorySlug} API, ${categorySlug} integration, social media API, posting API, scheduling API`;

  metadata.setBreadcrumbs(buildResourcesBreadcrumbs(categorySlug, categorySlug));

  return metadata.build();
};
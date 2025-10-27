import type { MetaDescriptor } from "react-router";
import type { Route } from "./+types/route";
import { MetadataComposer } from "~/lib/meta";
import { buildResourcesBreadcrumbs } from "~/lib/utils";

/**
 * Meta function for category index pages.
 * Uses automatic metadata generation from shared properties.
 */
export const meta: Route.MetaFunction = ({ data }): MetaDescriptor[] => {
  if (!data) return [];

  const seo = data.seo_meta ?? {};
  const siteUrl = data.siteUrl || "https://postfor.me";

  // Category-specific meta
  const title = seo.title || data.title || data.category?.name || "Category";
  const description = seo.description || data.summary || data.category?.description || "Browse category articles";
  const canonical = `${siteUrl}/resources/${data.slug}`;

  const metadata = new MetadataComposer();
  metadata.siteUrl = siteUrl;
  metadata.title = title;
  metadata.description = description;
  metadata.canonical = canonical;
  metadata.image = (data as any).coverImage;
  metadata.contentType = "website";

  if (data.category?.name) {
    metadata.keywords = `${data.category.name}, ${data.category.name} API, ${data.category.name} integration, social media API, posting API, scheduling API`;
  }

  metadata.setBreadcrumbs(buildResourcesBreadcrumbs(data.category?.name, data.slug));

  return metadata.build();
};
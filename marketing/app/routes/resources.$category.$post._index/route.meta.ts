import type { MetaDescriptor } from "react-router";
import type { Route } from "./+types/route";
import { MetadataComposer } from "~/lib/meta";
import { buildResourcesBreadcrumbs } from "~/lib/utils";

/**
 * Meta function for individual post pages.
 * Uses automatic metadata generation including rich article structured data.
 */
export const meta: Route.MetaFunction = ({ data }): MetaDescriptor[] => {
  if (!data) return [];

  const seo = data.seo_meta ?? {};
  const siteUrl = data.siteUrl || "https://postfor.me";

  // Post-specific meta
  const title = seo.title || data.title;
  const description = seo.description || data.summary;
  const canonical = `${siteUrl}/resources/${data.category?.slug}/${data.slug}`;
  const keywords = seo.keywords || data.tags?.map((tag) => tag.name).join(", ") || "";

  const metadata = new MetadataComposer();
  metadata.siteUrl = siteUrl;
  metadata.title = title;
  metadata.description = description;
  metadata.canonical = canonical;
  metadata.image = data.coverImage;
  metadata.contentType = "article";

  // Article-specific properties
  if (data.created_at) {
    metadata.publishedTime = new Date(data.created_at).toISOString();
  }
  if (data.updated_at) {
    metadata.modifiedTime = new Date(data.updated_at).toISOString();
  }
  if (data.authors?.[0]?.name) {
    metadata.author = data.authors[0].name;
  }

  // Add keywords
  if (keywords) {
    metadata.keywords = `${keywords}, social media API, posting API, ${data.category?.name} API`;
  }

  // Set breadcrumbs
  metadata.setBreadcrumbs(buildResourcesBreadcrumbs(
    data.category?.name,
    data.category?.slug,
    title
  ));

  return metadata.build();
};

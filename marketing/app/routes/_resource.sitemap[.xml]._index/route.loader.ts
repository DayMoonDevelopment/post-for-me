import { XMLBuilder } from "fast-xml-parser";

import { CMS } from "~/lib/.server/cms";
import { SITEMAP_CONFIG } from "~/lib/.server/sitemap.config";

import type { Route } from "./+types/route";

const builder = new XMLBuilder({
  format: true,
  suppressEmptyNode: true,
  attributeNamePrefix: "@_",
  ignoreAttributes: false,
});

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const baseUrl = url.origin;
  const currentDate = new Date().toISOString();

  const sitemaps = [
    {
      loc: `${baseUrl}${SITEMAP_CONFIG.SITEMAP_URLS.STATIC}`,
      lastmod: currentDate,
    },
    {
      loc: `${baseUrl}${SITEMAP_CONFIG.SITEMAP_URLS.COMPARE}`,
      lastmod: currentDate,
    },
    {
      loc: `${baseUrl}${SITEMAP_CONFIG.SITEMAP_URLS.SOLUTIONS}`,
      lastmod: currentDate,
    },
    {
      loc: `${baseUrl}${SITEMAP_CONFIG.SITEMAP_URLS.INTEGRATIONS}`,
      lastmod: currentDate,
    },
  ];

  // Calculate how many resource and blog sitemap pages we need
  try {
    const cms = new CMS();

    // Fetch first page of posts to get total count for resources sitemap
    const resourcesResponse = await cms.posts().limit(1).get();

    if (resourcesResponse?.pagination) {
      const totalPosts = resourcesResponse.pagination.totalItems;
      const totalPages = Math.ceil(totalPosts / SITEMAP_CONFIG.RESOURCES.PAGE_SIZE);

      // Add resource sitemap pages
      for (let page = 1; page <= totalPages; page++) {
        sitemaps.push({
          loc: `${baseUrl}${SITEMAP_CONFIG.SITEMAP_URLS.RESOURCES(page)}`,
          lastmod: currentDate,
        });
      }
    }

    // Fetch first page of blog posts to get total count for blog sitemap
    const blogResponse = await cms.posts().categories("blog").limit(1).get();

    if (blogResponse?.pagination) {
      const totalBlogPosts = blogResponse.pagination.totalItems;
      const totalBlogPages = Math.ceil(totalBlogPosts / SITEMAP_CONFIG.BLOG.PAGE_SIZE);

      // Add blog sitemap pages
      for (let page = 1; page <= totalBlogPages; page++) {
        sitemaps.push({
          loc: `${baseUrl}${SITEMAP_CONFIG.SITEMAP_URLS.BLOG(page)}`,
          lastmod: currentDate,
        });
      }
    }
  } catch (error) {
    console.error("Error generating sitemap index:", error);
    // Continue with just static sitemap on error
  }

  const sitemapIndex = {
    sitemapindex: {
      "@_xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9",
      sitemap: sitemaps,
    },
  };

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build(sitemapIndex)}`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": `public, max-age=${SITEMAP_CONFIG.CACHE.SUCCESS_MAX_AGE}, s-maxage=${SITEMAP_CONFIG.CACHE.SUCCESS_MAX_AGE}`,
      "Content-Length": xml.length.toString(),
    },
  });
}

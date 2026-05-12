import { XMLBuilder } from "fast-xml-parser";

import {
  generateStaticSitemapUrls,
  SITEMAP_CONFIG,
} from "~/lib/.server/sitemap.config";

const builder = new XMLBuilder({
  format: true,
  suppressEmptyNode: true,
  attributeNamePrefix: "@_",
  ignoreAttributes: false,
});

export function loader() {
  // Generate all static sitemap URLs from config
  const urls = generateStaticSitemapUrls();

  const sitemap = {
    urlset: {
      "@_xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9",
      url: urls,
    },
  };

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build(sitemap)}`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": `public, max-age=${SITEMAP_CONFIG.CACHE.SUCCESS_MAX_AGE}, s-maxage=${SITEMAP_CONFIG.CACHE.SUCCESS_MAX_AGE}`,
      "Content-Length": xml.length.toString(),
    },
  });
}
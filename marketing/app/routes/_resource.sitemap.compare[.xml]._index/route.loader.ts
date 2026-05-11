import { XMLBuilder } from "fast-xml-parser";

import { comparisons } from "~/lib/.server/data/comparisons";
import { SITEMAP_CONFIG } from "~/lib/.server/sitemap.config";

const builder = new XMLBuilder({
  format: true,
  suppressEmptyNode: true,
  attributeNamePrefix: "@_",
  ignoreAttributes: false,
});

export function loader() {
  const currentDate = new Date().toISOString().split("T")[0];
  const urls = [];

  // Compare index page
  urls.push({
    loc: `${SITEMAP_CONFIG.BASE_URL}/compare`,
    lastmod: currentDate,
    changefreq: SITEMAP_CONFIG.STATIC.MARKETING.CHANGE_FREQ,
    priority: SITEMAP_CONFIG.STATIC.MARKETING.PRIORITY,
  });

  // Individual comparison pages
  urls.push(
    ...Object.keys(comparisons).map((comparisonId) => ({
      loc: `${SITEMAP_CONFIG.BASE_URL}/compare/post-for-me-vs-${comparisonId}`,
      lastmod: currentDate,
      changefreq: SITEMAP_CONFIG.STATIC.MARKETING.CHANGE_FREQ,
      priority: SITEMAP_CONFIG.STATIC.MARKETING.PRIORITY,
    })),
  );

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

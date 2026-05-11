import { XMLBuilder } from "fast-xml-parser";

import { solutions } from "~/lib/.server/data/solutions";
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

  // Individual solution pages
  urls.push(
    ...Object.keys(solutions).map((solutionId) => ({
      loc: `${SITEMAP_CONFIG.BASE_URL}/solutions/${solutionId}`,
      lastmod: currentDate,
      changefreq: SITEMAP_CONFIG.STATIC.SOLUTIONS.CHANGE_FREQ,
      priority: SITEMAP_CONFIG.STATIC.SOLUTIONS.PRIORITY,
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

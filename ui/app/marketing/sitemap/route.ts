import { demoOrder } from "../../showcase/components/demos";

const SITE_URL = "https://ui.postforme.dev";

export function loader() {
  const paths = ["/", "/docs", ...demoOrder.map((slug) => `/docs/${slug}`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${SITE_URL}${p}</loc></url>`).join("\n")}
</urlset>
`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}

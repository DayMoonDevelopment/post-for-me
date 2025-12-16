import { XMLBuilder } from "fast-xml-parser";

import { MarbleCMS } from "~/lib/.server/marble";
import type { Post } from "~/lib/.server/marble.types";
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
  const currentDate = new Date().toISOString().split("T")[0];

  const staticPages = [
    "/",
    "/contact",
    "/faq",
    "/pricing",
    "/privacy",
    "/terms",
    "/resources",
  ];

  // Fetch all published posts from Marble CMS
  const marble = new MarbleCMS();
  const allPosts: Post[] = [];

  try {
    // Get all posts using limit=all to avoid pagination
    const response = await marble.fetch("posts?limit=all");

    if (response?.posts) {
      // Filter only published posts (posts with publishedAt date)
      const publishedPosts = response.posts.filter(
        (post: Post) => post.publishedAt,
      );
      allPosts.push(...publishedPosts);
    }
  } catch (error) {
    console.error("Error fetching posts for sitemap:", error);
  }

  // Create URLs for static pages
  const staticUrls = staticPages.map((path) => ({
    loc: `${baseUrl}${path}`,
    lastmod: currentDate,
    changefreq: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? "1.0" : "0.8",
  }));

  // Create URLs for published posts using /$category-slug/$post-slug format
  const postUrls = allPosts.map((post) => ({
    loc: `${baseUrl}/${post.category.slug}/${post.slug}`,
    lastmod: new Date(post.publishedAt).toISOString().split("T")[0],
    changefreq: "monthly",
    priority: "0.7",
  }));

  const urlset = {
    urlset: {
      "@_xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9",
      url: [...staticUrls, ...postUrls],
    },
  };

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build(urlset)}`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "Content-Length": xml.length.toString(),
    },
  });
}

import { data } from "react-router";

import type { Route } from "./+types/route";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);

  return data({
    title: "Resources",
    summary:
      "Browse our comprehensive guides and documentation for integrating Post for Me into your app or service.",
    slug: "",
    siteUrl: `${url.protocol}//${url.host}`,
    siteName: url.hostname,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    seo_meta: {
      title: "Resources - API Integration Guides",
      description:
        "Comprehensive guides for integrating with TikTok, Instagram, Facebook, and other social media APIs.",
    },
  });
}

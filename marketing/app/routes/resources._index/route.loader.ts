import { data } from "react-router";

import type { Route } from "./+types/route";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const now = new Date().toISOString();

  return data({
    title: "Resources",
    summary: "Browse our comprehensive guides and documentation for integrating Post for Me into your app or service.",
    slug: "",
    siteUrl: `${url.protocol}//${url.host}`,
    siteName: url.hostname,
    created_at: now,
    updated_at: now,
    pageType: "resource_listing",
    totalResources: 0, // Will be populated when posts data is available
  });
}

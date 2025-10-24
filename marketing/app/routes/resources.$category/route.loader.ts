import { data } from "react-router";
import { MarbleCMS } from "~/lib/.server/marble";

import type { Route } from "./+types/route";

export async function loader({ params, request }: Route.LoaderArgs) {
  const { category } = params;

  if (!category) {
    throw new Response("Not Found", { status: 404 });
  }

  // Try to get categories from parent loader context first to avoid redundant fetching
  // If not available, fetch categories as a fallback
  const marble = new MarbleCMS();
  const categoriesPromise = marble.getCategories().then(response => response?.categories || []);

  const url = new URL(request.url);

  return data({
    categoriesPromise,
    categorySlug: category,
    siteUrl: `${url.protocol}//${url.host}`,
    siteName: url.hostname,
  });
}

import { data } from "react-router";
import { MarbleCMS } from "~/lib/.server/marble";

import type { Route } from "./+types/route";

export async function loader({ params, request }: Route.LoaderArgs) {
  const { category } = params;

  if (!category) {
    throw new Response("Not Found", { status: 404 });
  }

  const marble = new MarbleCMS();
  const categoriesResponse = await marble.getCategories();

  const categories = categoriesResponse?.categories || [];

  // Find the current category
  const currentCategory = categories.find((cat) => cat.slug === category);

  if (!currentCategory) {
    throw new Response("Not Found", { status: 404 });
  }

  const url = new URL(request.url);

  return data({
    category: currentCategory,
    title: currentCategory.name,
    summary: currentCategory.description || `Browse all articles in the ${currentCategory.name} category.`,
    slug: currentCategory.slug,
    siteUrl: `${url.protocol}//${url.host}`,
    siteName: url.hostname,
    seo_meta: {
      title: `${currentCategory.name} - Resources`,
      description: currentCategory.description || `Browse all articles in the ${currentCategory.name} category.`,
    },
    breadcrumb: {
      title: currentCategory.name,
      href: null, // This is the current page
    },
  });
}

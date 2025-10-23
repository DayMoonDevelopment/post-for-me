import { data } from "react-router";
import { MarbleCMS } from "~/lib/.server/marble";

export const loader = async function () {
  const marble = new MarbleCMS();
  const categoriesResponse = await marble.getCategories();

  return data({
    categories: categoriesResponse?.categories || [],
    title: "Resources",
    summary:
      "Browse our comprehensive guides and documentation for integrating Post for Me into your app or service.",
    seo_meta: {
      title: "Resources - API Integration Guides",
      description:
        "Comprehensive guides for integrating with TikTok, Instagram, Facebook, and other social media APIs.",
    },
    siteUrl: "https://postfor.me",
    siteName: "Post For Me",
    slug: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
};

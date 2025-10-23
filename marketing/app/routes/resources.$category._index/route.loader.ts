import { data } from "react-router";
import { MarbleCMS } from "~/lib/.server/marble";

export async function loader({ params, request }: { params: any; request: Request }) {
  const { category } = params;

  if (!category) {
    throw new Response("Not Found", { status: 404 });
  }

  const marble = new MarbleCMS();
  const [categoriesResponse, postsResponse] = await Promise.all([
    marble.getCategories(),
    marble.getPosts()
  ]);

  const categories = categoriesResponse?.categories || [];
  const posts = postsResponse?.posts || [];

  // Find the current category
  const currentCategory = categories.find(cat => cat.slug === category);

  if (!currentCategory) {
    throw new Response("Not Found", { status: 404 });
  }

  // Filter posts for this category
  const categoryPosts = posts.filter(post => post.category.slug === category);

  // Get site name from request host
  const url = new URL(request.url);
  const siteName = url.hostname;

  return data({
    category: currentCategory,
    posts: categoryPosts,
    title: currentCategory.name,
    summary: currentCategory.description || `Browse all articles in the ${currentCategory.name} category.`,
    slug: currentCategory.slug,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    seo_meta: {
      title: `${currentCategory.name} - Resources`,
      description: currentCategory.description || `Browse all articles in the ${currentCategory.name} category.`,
      keywords: `${currentCategory.name}, API, social media, integration`,
    },
    siteName,
    siteUrl: `${url.protocol}//${url.host}`,
    breadcrumb: {
      title: currentCategory.name,
      href: null, // This is the current page
    },
  });
}

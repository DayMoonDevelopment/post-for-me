import { data } from "react-router";
import { MarbleCMS } from "~/lib/.server/marble";

import type { Route } from "./+types/route";

export async function loader(_args: Route.LoaderArgs) {
  const marble = new MarbleCMS();

  const [categoriesResponse, postsResponse] = await Promise.all([
    marble.getCategories(),
    marble.getPosts(),
  ]);

  return data({
    categories: categoriesResponse?.categories || [],
    posts: postsResponse?.posts || [],
  });
}

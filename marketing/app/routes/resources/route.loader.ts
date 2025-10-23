import { data } from "react-router";
import { MarbleCMS } from "~/lib/.server/marble";

export const loader = async function () {
  const marble = new MarbleCMS();

  const [categoriesResponse, postsResponse] = await Promise.all([
    marble.getCategories(),
    marble.getPosts(),
  ]);

  return data({
    categories: categoriesResponse?.categories || [],
    posts: postsResponse?.posts || [],
  });
};

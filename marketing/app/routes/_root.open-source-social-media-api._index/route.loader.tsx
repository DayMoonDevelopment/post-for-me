import { getGitHubStars } from "~/lib/.server/github";

export async function loader() {
  const stars = await getGitHubStars();

  return {
    stars,
  };
}

import { data } from "react-router";

import { comparisons } from "~/lib/.server/data/comparisons";

import type { Route } from "./+types/route";

export async function loader({ params }: Route.LoaderArgs) {
  const { path } = params;

  // Extract competitor name from pattern: post-for-me-vs-<name>
  const name = path.replace(/^post-for-me-vs-/, "");

  const comparison = comparisons[name];

  if (!comparison) {
    throw data("Comparison not found", { status: 404 });
  }

  return { comparison };
}

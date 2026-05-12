import { marked } from "marked";
import { data } from "react-router";

import { getFAQsForRoute } from "~/lib/.server/data/faq";
import { solutions } from "~/lib/.server/data/solutions";

import type { Route } from "./+types/route";

export async function loader({ params }: Route.LoaderArgs) {
  const { id } = params;

  const solution = solutions[id];

  if (!solution) {
    throw data("Solution not found", { status: 404 });
  }

  // Get FAQs for this solution route
  const faqs = getFAQsForRoute(`solutions.${id}`);

  return {
    solution,
    faq: faqs.map((item) => ({
      question: item.question,
      answer: marked(item.answer, { async: false }),
    })),
  };
}

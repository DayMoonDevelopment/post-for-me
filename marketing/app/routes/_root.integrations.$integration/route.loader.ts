import { marked } from "marked";
import { data } from "react-router";

import { getFAQsForRoute } from "~/lib/.server/data/faq";
import { integrations } from "~/lib/.server/data/integrations";

import type { Route } from "./+types/route";

export async function loader({ params }: Route.LoaderArgs) {
  const { integration: integrationId } = params;

  const integration = integrations[integrationId];

  if (!integration) {
    throw data("Integration not found", { status: 404 });
  }

  const faqs = getFAQsForRoute(`integrations.${integrationId}`);

  return {
    integration,
    faq: faqs.map((item) => ({
      question: item.question,
      answer: marked(item.answer, { async: false }),
    })),
  };
}

import { marked } from "marked";

import { getFAQsForRoute } from "~/lib/.server/data/faq";
import { integrations } from "~/lib/.server/data/integrations";

export async function loader() {
  const integration = integrations.linkedin;
  const faqs = getFAQsForRoute("integrations.linkedin");

  return {
    integration,
    faq: faqs.map((item) => ({
      question: item.question,
      answer: marked(item.answer, { async: false }),
    })),
  };
}

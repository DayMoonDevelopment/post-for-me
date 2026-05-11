import { marked } from "marked";

import {
  getFAQsByCategory,
  getCategoryDisplayName,
  getAllFAQs,
} from "~/lib/.server/data/faq";

import type { FAQItem } from "~/lib/global.types";

export function loader() {
  const faqsByCategory = getFAQsByCategory();
  const allFAQs = getAllFAQs();

  return {
    // Categorized FAQs for visual display (excludes FAQs without categories)
    faq: faqsByCategory
      .filter((section) => section.items.length > 0)
      .map((section) => ({
        title: getCategoryDisplayName(section.category),
        faq: section.items.map((item) => ({
          q: item.question,
          a: marked(item.answer, { async: false }),
        })),
      })),
    // All FAQs (including uncategorized) for metadata/SEO
    allFAQs: allFAQs.map((item: FAQItem) => ({
      q: item.question,
      a: marked(item.answer, { async: false }),
    })),
  };
}

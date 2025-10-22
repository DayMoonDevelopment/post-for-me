import { marked } from "marked";

import { faq } from "./data/faq";

export function loader() {
  return {
    faq: faq.map((section) => ({
      title: section.title,
      faq: section.faq.map(({ q, a }) => ({
        q,
        a: marked(a, { async: false }),
      })),
    })),
  };
}

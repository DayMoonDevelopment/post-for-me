import { getFAQsForRoute } from "~/lib/.server/data/faq";

export function loader() {
  const faq = getFAQsForRoute("home");

  return {
    app: {
      version: "1.1.0",
      url: "#",
    },
    faq: faq.map((item) => ({
      q: item.question,
      a: item.answer,
    })),
  };
}

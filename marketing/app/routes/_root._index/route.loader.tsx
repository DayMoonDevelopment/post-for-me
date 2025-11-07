import { faq } from "~/lib/.server/data/faq";

export function loader() {
  return {
    app: {
      version: "1.1.0",
      url: "#",
    },
    faq,
  };
}

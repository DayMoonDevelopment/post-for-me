import { useLoaderData } from "react-router";
import { FAQ } from "./components/faq";

import type { Route } from "./+types/route";

export function Component() {
  const { faq } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="relative flex flex-col gap-0 pt-16">
      {faq.map((section, i) => (
        <FAQ
          key={`${section.title}-${i}`}
          title={section.title}
          faq={section.faq}
        />
      ))}
    </div>
  );
}

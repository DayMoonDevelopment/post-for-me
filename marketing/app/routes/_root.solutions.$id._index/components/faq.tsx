import { useLoaderData } from "react-router";

import { FAQSection } from "~/components/faq-section";

import type { Route } from "../+types/route";

export const FAQ = () => {
  const { faq } = useLoaderData<Route.ComponentProps["loaderData"]>();

  // Only render if we have FAQs
  if (!faq || faq.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-center px-6 py-12">
      <FAQSection
        title="Common questions"
        faqs={faq}
        link={{
          to: "/faq",
          text: "more questions answered",
        }}
      />
    </div>
  );
};

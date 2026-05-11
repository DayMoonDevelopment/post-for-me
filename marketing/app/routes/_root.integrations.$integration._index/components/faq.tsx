import { useRouteLoaderData } from "react-router";

import { FAQSection } from "~/components/faq-section";

import type { loader } from "~/routes/_root.integrations.$integration/route.loader";

export const FAQ = () => {
  const data = useRouteLoaderData<typeof loader>(
    "routes/_root.integrations.$integration",
  );
  const faq = data?.faq;

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

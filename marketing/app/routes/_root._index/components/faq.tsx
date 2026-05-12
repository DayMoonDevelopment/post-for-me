import { useLoaderData } from "react-router";

import { FAQSection } from "~/components/faq-section";

import type { Route } from "../+types/route";

export const FAQ = () => {
  const { faq } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div id="faq" className="flex items-center justify-center px-6 py-12">
      <FAQSection
        title={
          <>
            Frequently Asked <br /> Questions
          </>
        }
        faqs={faq.map(({ q, a }) => ({
          question: q,
          answer: a,
        }))}
        link={{
          to: "/faq",
          text: "more questions answered",
        }}
      />
    </div>
  );
};

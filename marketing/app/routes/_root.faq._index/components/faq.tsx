import { FAQSection } from "~/components/faq-section";

import type { FAQType } from "~/lib/global.types";

export const FAQ = ({ title, faq }: { title: string; faq: FAQType[] }) => {
  return (
    <div className="flex items-center justify-center px-6 py-12">
      <FAQSection
        title={title}
        faqs={faq.map(({ q, a }) => ({
          question: q,
          answer: a,
        }))}
      />
    </div>
  );
};

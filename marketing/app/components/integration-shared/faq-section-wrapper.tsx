import { FAQSection } from "~/components/faq-section";

interface FAQSectionWrapperProps {
  faq: Array<{ question: string; answer: string }>;
}

export const FAQSectionWrapper = ({ faq }: FAQSectionWrapperProps) => {
  if (!faq || faq.length === 0) return null;

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

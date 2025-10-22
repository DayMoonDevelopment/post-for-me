import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/ui/accordion";

import type { FAQType } from "~/lib/global.types";

export const FAQ = ({ title, faq }: { title: string; faq: FAQType[] }) => {
  return (
    <div className="flex items-center justify-center px-6 py-12">
      <div className="grid grid-cols-5 items-start gap-x-12 gap-y-6 max-w-6xl">
        <div className="col-span-2">
          <h2 className="text-4xl lg:text-5xl leading-[1.15]! font-semibold tracking-tighter">
            {title}
          </h2>
        </div>

        <div className="col-span-3">
          <Accordion type="single" defaultValue="question-0" className="w-full">
            {faq.map(({ q, a }, index) => (
              <AccordionItem
                key={q}
                value={`question-${index}`}
                className="w-full"
              >
                <AccordionTrigger className="text-left text-lg w-full">
                  {q}
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground w-full">
                  {a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
};

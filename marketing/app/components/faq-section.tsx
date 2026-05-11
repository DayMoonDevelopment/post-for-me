import { IconArrowRight } from "@central-icons/outlined";

import { Link } from "~/components/link";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/ui/accordion";
import { Button } from "~/ui/button";

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQSectionProps {
  title: string | React.ReactNode;
  faqs: FAQItem[];
  link?: {
    to: string;
    text: string;
  };
}

export const FAQSection = ({ title, faqs, link }: FAQSectionProps) => {
  if (!faqs || faqs.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 items-start gap-x-12 gap-y-6 max-w-6xl w-full">
      <div className="col-span-1 lg:col-span-2">
        <h2 className="text-4xl lg:text-5xl leading-[1.15]! font-semibold tracking-tighter">
          {title}
        </h2>
        {link ? <Button mode="link" asChild>
            <Link to={link.to}>
              {link.text}
              <IconArrowRight />
            </Link>
          </Button> : null}
      </div>

      <div className="col-span-1 lg:col-span-3">
        <Accordion
          type="single"
          defaultValue="item-0"
          className="w-full flex flex-col"
        >
          {faqs.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="w-full flex-1 flex flex-col"
            >
              <AccordionTrigger className="text-left text-lg w-full">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground w-full flex-1 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-primary/80">
                <div
                  className="w-full"
                  dangerouslySetInnerHTML={{ __html: item.answer }}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

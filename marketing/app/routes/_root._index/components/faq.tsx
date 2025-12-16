import { useLoaderData, Link } from "react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/ui/accordion";

import { Button } from "~/ui/button";
import { ArrowRightIcon } from "icons";

import type { Route } from "../+types/route";

export const FAQ = () => {
  const { faq } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div id="faq" className="flex items-center justify-center px-6 py-12">
      <div className="flex flex-col md:flex-row items-start gap-x-12 gap-y-6">
        <div className="">
          <h2 className="text-4xl lg:text-5xl leading-[1.15]! font-semibold tracking-tighter">
            Frequently Asked <br /> Questions
          </h2>

          <Button variant="link" asChild>
            <Link to="/faq">
              more questions answered
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>

        <Accordion type="single" defaultValue="question-0" className="max-w-xl">
          {faq.map(({ q, a }, index) => (
            <AccordionItem key={q} value={`question-${index}`}>
              <AccordionTrigger className="text-left text-lg">
                {q}
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                {a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

import { useLoaderData } from "react-router";

import { cn } from "~/lib/utils";

import { FAQ } from "./components/faq";

import type { Route } from "./+types/route";

export function Component() {
  const { faq } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="relative flex flex-col gap-0 pt-16">
      <h1 className="mx-auto text-center text-4xl lg:text-6xl leading-[1.15]! font-semibold tracking-tighter my-16">
        Frequently Asked <br /> Questions
      </h1>

      {faq.map((section, i) => (
        <div
          key={`${section.title}-${i}`}
          className={cn("w-full", i % 2 === 0 && "bg-muted")}
        >
          <FAQ title={section.title} faq={section.faq} />
        </div>
      ))}
    </div>
  );
}

import { useLoaderData } from "react-router";

import { RawHtml } from "~/components/raw-html";

import { Separator } from "~/ui/separator";

import type { Route } from "./+types/route";

export function Component() {
  const { title, summary, content } =
    useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="max-w-3xl mx-auto pt-6">
      <h1 className="text-4xl font-semibold mb-3">{title}</h1>
      <p className="mb-4 max-w-2xl text-base leading-tight text-muted-foreground">
        {summary}
      </p>

      <Separator className="mt-6 mb-5" />

      <article className="prose max-w-none pt-2.5">
        <RawHtml html={content} />
      </article>
    </div>
  );
}

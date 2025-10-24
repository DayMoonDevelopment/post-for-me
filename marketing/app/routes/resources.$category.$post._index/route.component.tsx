import { useLoaderData, Await } from "react-router";
import { Suspense } from "react";

import { RawHtml } from "~/components/raw-html";
import { Separator } from "~/ui/separator";

import type { Route } from "./+types/route";

export function Component() {
  const { title, summary, content } =
    useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="pt-2">
      <h1 className="text-4xl font-semibold mb-3">{title}</h1>
      <p className="mb-4 max-w-2xl text-lg text-muted-foreground">{summary}</p>

      <Separator className="mt-6 mb-5" />

      <Suspense fallback={
        <article className="prose max-w-none pt-2.5">
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse">Loading content...</div>
          </div>
        </article>
      }>
        <Await resolve={content}>
          {(resolvedContent) => (
            <article className="prose max-w-none pt-2.5">
              <RawHtml html={resolvedContent} />
            </article>
          )}
        </Await>
      </Suspense>
    </div>
  );
}

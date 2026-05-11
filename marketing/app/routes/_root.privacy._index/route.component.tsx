import { useLoaderData } from "react-router";

import { RawHtml } from "~/components/raw-html";

import type { Route } from "./+types/route";

export function PrivacyPolicy() {
  const data = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="p-4 pt-22 max-w-3xl mx-auto">
      <RawHtml html={data.content} />
    </div>
  );
}

import { useLoaderData } from "react-router";

import { SubscriptionRequired } from "~/components/subscription-required";

import type { loader } from "./route.loader";

import { ResultDetailView } from "./components/result-detail-view";

/**
 * Social post result page, at the top-level `/social-post-results/:id` resource
 * URL, read from the real API via a temporary project key. When the API is
 * unavailable (no subscription / misconfig) it renders an in-page notice instead.
 * The main view is split out so it only runs with the non-null result.
 */
export function Component() {
  const loaderData = useLoaderData<typeof loader>();

  if (loaderData.unavailable || !loaderData.result) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <SubscriptionRequired
          namespace="socialPostResults.unavailable"
          reason={loaderData.reason ?? "error"}
          teamId={loaderData.teamId}
        />
      </div>
    );
  }

  return <ResultDetailView result={loaderData.result} />;
}

import { useLoaderData } from "react-router";

import { SubscriptionRequired } from "~/components/subscription-required";

import type { loader } from "./route.loader";

import { PostDetailView } from "./components/post-detail-view";

/**
 * Post detail page (PFM-704), at the top-level `/social-posts/:id` resource URL,
 * read from the real API via a temporary project key. When the API is unavailable
 * (no subscription / misconfig) it renders an in-page notice instead. The main
 * view is split out so it only runs with the non-null post.
 */
export function Component() {
  const loaderData = useLoaderData<typeof loader>();

  if (loaderData.unavailable || !loaderData.post) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <SubscriptionRequired
          namespace="socialPosts.unavailable"
          reason={loaderData.reason ?? "error"}
          teamId={loaderData.teamId}
        />
      </div>
    );
  }

  return <PostDetailView post={loaderData.post} />;
}

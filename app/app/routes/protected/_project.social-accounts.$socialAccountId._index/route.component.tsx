import { useLoaderData } from "react-router";

import { SubscriptionRequired } from "~/components/subscription-required";

import type { loader } from "./route.loader";

import { AccountDetailView } from "./components/account-detail-view";

/**
 * Social account detail page (PFM-693), at the top-level `/social-accounts/:id`
 * resource URL. Reads the loader (account + non-secret token meta), read from
 * the real API via a temporary project key. When the API is unavailable (no
 * subscription / misconfig) it renders an in-page notice instead. The main view
 * is split out so hooks run only with non-null data. Token VALUES are never here
 * — they're fetched on demand inside the tokens section from the dedicated
 * resource route.
 */
export function Component() {
  const loaderData = useLoaderData<typeof loader>();

  if (
    loaderData.unavailable ||
    !loaderData.account ||
    !loaderData.tokenMeta ||
    !loaderData.posts
  ) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <SubscriptionRequired
          namespace="socialAccounts.unavailable"
          reason={loaderData.reason ?? "error"}
          teamId={loaderData.teamId}
        />
      </div>
    );
  }

  return (
    <AccountDetailView
      account={loaderData.account}
      tokenMeta={loaderData.tokenMeta}
      posts={loaderData.posts}
    />
  );
}

import { useTranslation } from "react-i18next";
import { useLoaderData } from "react-router";

import { SubscriptionRequired } from "~/components/subscription-required";
import { SocialPostComposerProvider } from "~/hooks/use-social-post-composer";

import type { loader } from "./route.loader";

import {
  SocialPostComposer,
  SocialPostComposerActions,
} from "./components/social-post-composer";
import { SocialPostPreviewPanel } from "./components/social-post-preview-panel";

/**
 * The Posting Playground (PFM-696): the project's home for authoring a post. It runs the
 * registry's `@post-for-me/social-post-composer` block — account picker, media, per-platform
 * caption, and per-platform options — over the registry's `SocialPostComposerProvider`, which
 * owns the whole-post draft (the "global page context"). The loader supplies the connected
 * accounts; publishing (post-now / schedule / save-draft) is wired to the route action. When
 * the API is unavailable an in-page notice replaces the composer.
 */
export function Component() {
  const { accounts, unavailable, reason, teamId } =
    useLoaderData<typeof loader>();
  const { t } = useTranslation();

  const titleBlock = (
    <div className="flex flex-col gap-1">
      <h1 className="font-heading text-2xl font-semibold text-foreground">
        {t("playground.pageTitle")}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t("playground.pageDescription")}
      </p>
    </div>
  );

  if (unavailable) {
    return (
      <div className="flex flex-col gap-6 p-6">
        {titleBlock}
        <SubscriptionRequired
          namespace="playground.unavailable"
          reason={reason ?? "error"}
          teamId={teamId}
        />
      </div>
    );
  }

  return (
    <SocialPostComposerProvider accounts={accounts}>
      <div className="flex flex-col gap-6 p-6">
        {/* Publish/save-draft sit on the header's trailing edge, inline with the title. */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          {titleBlock}
          <SocialPostComposerActions />
        </div>

        {/* Compose on the left, live preview on the right; stacks on narrow screens.
            Both read the same provider, so the preview tracks every edit. */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <SocialPostComposer />
          <div className="w-full lg:sticky lg:top-6 lg:max-w-sm">
            <SocialPostPreviewPanel />
          </div>
        </div>
      </div>
    </SocialPostComposerProvider>
  );
}

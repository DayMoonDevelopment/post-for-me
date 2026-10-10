import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Link,
  useLoaderData,
  useLocation,
  useNavigation,
  useSearchParams,
} from "react-router";

import type { SocialPostListParams } from "~/lib/types/social-post";

import { SubscriptionRequired } from "~/components/subscription-required";
import { AddIcon, PostsIcon } from "~/icons";
import { Button } from "~/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/ui/empty";

import type { loader } from "./route.loader";

import { PostFilters } from "./components/post-filters";
import { PostsDataGrid } from "./components/posts-data-grid";
import { parseListParams, serializeListParams } from "./schemas/list-params";

/** The primary action for this surface: compose a new post in the posting
 * playground (PFM-696 — route not built yet; the link is intentional, mirroring
 * how the account detail page already links to `/social-posts/$id`). */
function CreatePostButton({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  return (
    <Button
      className="shrink-0"
      render={<Link to={`/projects/${projectId}/playground`} />}
    >
      <AddIcon />
      {t("socialPosts.createPost")}
    </Button>
  );
}

/**
 * Social Posts list page (PFM-702). Full-bleed header, the filter bar, and the
 * server-driven grid, all read from the real API via a temporary project key.
 * When the API is unavailable (no subscription / misconfig) an in-page notice
 * replaces the grid. Posts are read-only here (authored via the API/playground),
 * so there are no row mutations — row click opens the detail page. The primary
 * action is "Create a post" → the playground. When there are no posts AND no
 * active filter, an empty state replaces the grid.
 */
export function Component() {
  const { result, projectId, unavailable, reason, teamId } =
    useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const [, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const location = useLocation();

  // Drive the filter/sort/page UI from the *pending* navigation URL when one is
  // in flight, so any param change reflects immediately even while the table is
  // still reloading. Falls back to the committed URL when idle.
  const params = useMemo(
    () =>
      parseListParams(
        new URLSearchParams(navigation.location?.search ?? location.search),
      ),
    [navigation.location?.search, location.search],
  );

  const updateParams = useCallback(
    (next: SocialPostListParams) => {
      setSearchParams(serializeListParams(next), { preventScrollReset: true });
    },
    [setSearchParams],
  );

  const hasActiveQuery = Boolean(
    params.platform?.length ||
      params.status?.length ||
      params.externalId ||
      params.socialAccountId,
  );
  // Only fall to the empty state when settled — avoids flashing it mid-reload
  // (when `result` is still the previous query's data).
  const showEmptyState =
    !unavailable &&
    result.total === 0 &&
    !hasActiveQuery &&
    navigation.state === "idle";

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-heading text-2xl font-semibold text-foreground">
        {t("socialPosts.pageTitle")}
      </h1>

      {unavailable ? (
        <SubscriptionRequired
          namespace="socialPosts.unavailable"
          reason={reason ?? "error"}
          teamId={teamId}
        />
      ) : showEmptyState ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PostsIcon />
            </EmptyMedia>
            <EmptyTitle>{t("socialPosts.empty.title")}</EmptyTitle>
            <EmptyDescription>
              {t("socialPosts.empty.description")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <CreatePostButton projectId={projectId} />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          <PostFilters
            params={params}
            onParamsChange={updateParams}
            actionSlot={<CreatePostButton projectId={projectId} />}
          />
          <PostsDataGrid
            posts={result.posts}
            total={result.total}
            params={params}
            onParamsChange={updateParams}
          />
        </div>
      )}
    </div>
  );
}

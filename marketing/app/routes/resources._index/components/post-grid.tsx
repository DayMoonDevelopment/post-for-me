import { Link } from "~/components/link";

import { Skeleton } from "~/ui/skeleton";
import { Card, CardContent, CardTitle, CardDescription } from "~/ui/card";

import type { loader } from "~/routes/resources/route";

type ResourcesLoader = Awaited<ReturnType<typeof loader>>;

export function PostGrid({
  tags,
  posts,
}: {
  tags: ResourcesLoader["data"]["tags"];
  posts: Awaited<ResourcesLoader["data"]["posts"]>;
}) {
  // Group posts by tag
  const postsByTag = posts.reduce(
    (acc, post) => {
      post.tags.forEach((tag) => {
        if (!acc[tag.id]) {
          acc[tag.id] = [];
        }
        acc[tag.id].push(post);
      });
      return acc;
    },
    {} as Record<string, typeof posts>,
  );

  return tags.map((tag) => {
    const tagPosts = postsByTag[tag.id] || [];
    if (tagPosts.length === 0) return null;

    return (
      <div key={tag.id} className="space-y-2">
        <h2 className="font-medium text-muted-foreground pl-1">{tag.name}</h2>

        <div className="grid grid-cols-4 gap-4">
          {tagPosts.map((post) => (
            <Link key={post.id} to={`/resources/${post.slug}`}>
              <Card>
                <CardContent>
                  <CardTitle>{post.title}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {post.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  });
}

export function PostGridSkeleton() {
  return (
    <div className="space-y-12">
      {Array(3)
        .fill(null)
        .map((_, index) => (
          <div key={index} className="space-y-3">
            <div className="grid grid-cols-4 gap-4 items-center">
              <Skeleton className="h-4 rounded-full" />
            </div>

            <div className="grid grid-cols-4 gap-4 items-center">
              {Array(3)
                .fill(null)
                .map((_, index) => (
                  <Skeleton key={index} className="w-full h-20" />
                ))}
            </div>
          </div>
        ))}
    </div>
  );
}

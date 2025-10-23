import { Link, useLoaderData } from "react-router";

import { Card, CardDescription, CardHeader, CardTitle } from "~/ui/card";
import { Separator } from "~/ui/separator";

import type { Route } from "./+types/route";

export function Component() {
  const { title, summary, posts, category } =
    useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="pt-2">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold mb-3">{title}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">{summary}</p>
      </div>

      <Separator className="mb-8" />

      {posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`/resources/${category.slug}/${post.slug}`}
              className="block transition-transform hover:scale-102"
            >
              <Card className="h-full shadow-none bg-muted">
                {post.coverImage ? (
                  <div className="aspect-video overflow-hidden rounded-t-lg">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : null}
                <CardHeader>
                  <CardTitle className="text-xl line-clamp-2">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-3 empty:hidden">
                    {post?.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No articles found
          </h3>
          <p className="text-muted-foreground">
            There are no articles in this category yet.
          </p>
        </div>
      )}
    </div>
  );
}

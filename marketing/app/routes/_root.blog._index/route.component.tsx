import { IconArrowRight, IconNewspaper } from "@central-icons/outlined";
import { format } from "date-fns";
import { Link, useLoaderData } from "react-router";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/ui/card";

import type { Route } from "./+types/route";

export default function BlogIndex() {
  const { posts } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="container mx-auto px-4 pt-24 max-w-7xl">
      {/* Header */}
      <div className="mb-12">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
          Get the most out of Post for Me
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl">
          Technical guides, integration tutorials, and insights for developers
          building social media automation.
        </p>
      </div>

      {/* Blog Posts Grid */}
      {posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">
            No blog posts yet. Check back soon!
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              className="group transition-shadow hover:shadow-md rounded-xl"
            >
              <Card
                as="article"
                className="h-full transition-shadow hover:shadow-md overflow-hidden pt-0"
              >
                <div className="w-full aspect-video bg-muted flex items-center justify-center mb-4 overflow-hidden">
                  {post.coverImage ? (
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                    />
                  ) : (
                    <IconNewspaper className="w-16 h-16 text-muted-foreground/30" />
                  )}
                </div>

                <CardHeader>
                  {/* Post Meta */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {post.publishedAt ? (
                      <time dateTime={post.publishedAt.toISOString()}>
                        {format(post.publishedAt, "MMM d, yyyy")}
                      </time>
                    ) : null}
                    {post.authors && post.authors.length > 0 ? (
                      <>
                        <span>•</span>
                        <span>{post.authors[0].name}</span>
                      </>
                    ) : null}
                  </div>

                  <CardTitle className="text-lg leading-tight">
                    {post.title}
                  </CardTitle>
                </CardHeader>

                {post.description ? (
                  <CardContent>
                    <CardDescription className="line-clamp-3">
                      {post.description}
                    </CardDescription>
                  </CardContent>
                ) : null}

                <CardFooter className="mt-auto pt-2">
                  <span className="text-sm text-primary font-medium inline-flex items-center gap-1">
                    Read post
                    <IconArrowRight className="size-4" />
                  </span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

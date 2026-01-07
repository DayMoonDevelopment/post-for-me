import { useEffect } from "react";
import { useLoaderData, useRevalidator } from "react-router";
import { ArrowRotateRightLeftIcon } from "icons";

import { cn } from "~/lib/utils";

import { Copyable } from "~/components/copyable";

import { Button } from "~/ui/button";
import { Badge } from "~/ui/badge";

import { PostContent } from "./_post-content";

import type { Route } from "./+types/route";

function badgeVariant(status: string) {
  switch (status) {
    case "processing":
      return "secondary";
    case "error":
      return "destructive";
    case "posted":
    case "processed":
      return "affirmative";
    default:
      return "highlight";
  }
}

export function Component() {
  const { post } = useLoaderData<Route.ComponentProps["loaderData"]>();
  const revalidator = useRevalidator();

  // Auto-revalidate for processing posts
  useEffect(() => {
    if (post.status === "processing") {
      const interval = setInterval(() => {
        revalidator.revalidate();
      }, 5000); // Revalidate every 5 seconds

      return () => clearInterval(interval);
    }
  }, [post.status, revalidator]);

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col-reverse md:flex-row items-start justify-between gap-4">
        <div>
          <div className="flex flex-row gap-2 items-center">
            <h1 className="text-2xl font-bold">Post Result</h1>
            <Badge variant={badgeVariant(post.status)}>{post.status}</Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Created: {new Date(post.created_at).toLocaleString()}
          </p>

          <p className="text-xs text-muted-foreground font-light italic mt-1">
            It may take a few minutes for the content to process and be visible
            on your profile.
          </p>
        </div>

        <div className="flex flex-row items-center gap-2 max-md:self-end">
          <Button
            size="icon"
            variant="ghost"
            disabled={revalidator.state === "loading"}
            onClick={() => revalidator.revalidate()}
          >
            <ArrowRotateRightLeftIcon
              className={cn(
                revalidator.state === "loading" ? "animate-spin" : "",
              )}
            />
          </Button>

          <Copyable value={post.id}>
            <div className="flex flex-row bg-card py-1 px-2 border rounded-sm text-xs font-mono">
              <span>{post.id}</span>
            </div>
          </Copyable>
        </div>
      </div>

      <PostContent />
    </div>
  );
}

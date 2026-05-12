import { Link } from "react-router";

import { cn } from "~/lib/utils";

import { ArrowUpRightIcon, CheckmarkSmallIcon, CrossSmallIcon } from "~/components/icons";

import { Copyable } from "~/components/copyable";

import { Card, CardContent, CardFooter, CardHeader } from "~/ui/card";
import { Button } from "~/ui/button";

import { useLoaderData } from "react-router";
import type { LoaderData } from "./types";

export function PostContentProcessed() {
  const { results } = useLoaderData<LoaderData>();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {results.map((result) => (
        <Card key={result.id} className="overflow-hidden">
          <CardHeader>
            <Copyable value={result.id} className="mr-auto">
              <div className="flex flex-row text-xs font-mono">
                <span>{result.id}</span>
              </div>
            </Copyable>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-1 text-sm">
                <span className="text-muted-foreground">Status:</span>

                <div
                  className={cn(
                    "col-span-2 flex flex-row items-center gap-1 [&_svg]:size-4",
                    result.success ? "text-affirmative" : "text-destructive",
                  )}
                >
                  {result.success ? <CheckmarkSmallIcon /> : <CrossSmallIcon />}
                  {result.success ? "Successfully posted" : "Failed to post"}
                </div>
              </div>

              {result.success ? null : (
                <div className="grid grid-cols-3 gap-1 text-sm">
                  <span className="text-muted-foreground">Error Message:</span>

                  <div className={cn("col-span-2")}>{result.error}</div>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter>
            <Button
              variant="secondary"
              className="w-full"
              size="sm"
              disabled={!result?.platform_data?.url}
              asChild={Boolean(result?.platform_data?.url)}
            >
              {result?.platform_data?.url ? (
                <Link
                  to={result?.platform_data?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on platform
                  <ArrowUpRightIcon />
                </Link>
              ) : (
                <span>No URL available</span>
              )}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

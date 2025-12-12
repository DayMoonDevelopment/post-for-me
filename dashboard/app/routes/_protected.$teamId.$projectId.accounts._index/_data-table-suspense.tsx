import * as React from "react";
import { Await } from "react-router";
import { SocialConnectionsDataTable } from "./_data-table";

import type { LoaderData } from "./_types";

interface DataTableSuspenseProps {
  dataPromise: Promise<LoaderData>;
}

export function DataTableSuspense({ dataPromise }: DataTableSuspenseProps) {
  return (
    <React.Suspense fallback={<DataTableSkeleton />}>
      <Await resolve={dataPromise}>
        {(data) => <SocialConnectionsDataTable data={data} />}
      </Await>
    </React.Suspense>
  );
}

function DataTableSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-64 bg-muted animate-pulse rounded-md" />
          <div className="h-10 w-40 bg-muted animate-pulse rounded-md" />
        </div>
        <div className="h-10 w-24 bg-muted animate-pulse rounded-md" />
      </div>

      <div className="rounded-md border">
        <div className="h-12 bg-muted animate-pulse" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-16 border-t bg-muted/50 animate-pulse" />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-muted animate-pulse rounded" />
          <div className="h-8 w-8 bg-muted animate-pulse rounded" />
          <div className="h-8 w-8 bg-muted animate-pulse rounded" />
          <div className="h-8 w-8 bg-muted animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}

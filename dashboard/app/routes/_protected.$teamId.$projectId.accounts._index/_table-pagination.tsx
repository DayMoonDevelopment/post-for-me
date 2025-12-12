import * as React from "react";
import { useSearchParams, useSubmit } from "react-router";

import { Button } from "~/ui/button";
import type { LoaderData } from "./_types";

interface TablePaginationProps {
  data: LoaderData;
}

export function TablePagination({ data }: TablePaginationProps) {
  const [searchParams] = useSearchParams();
  const submit = useSubmit();

  const handlePageChange = React.useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams);
      params.set("page", page.toString());
      submit(params, { method: "get" });
    },
    [searchParams, submit]
  );

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        Showing {(data.currentPage - 1) * 100 + 1} to{" "}
        {Math.min(data.currentPage * 100, data.totalCount)} of {data.totalCount}{" "}
        results
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">
            Page {data.currentPage} of {data.totalPages}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => handlePageChange(1)}
            disabled={!data.hasPreviousPage}
          >
            <span className="sr-only">Go to first page</span>
            {"<<"}
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => handlePageChange(data.currentPage - 1)}
            disabled={!data.hasPreviousPage}
          >
            <span className="sr-only">Go to previous page</span>
            {"<"}
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => handlePageChange(data.currentPage + 1)}
            disabled={!data.hasNextPage}
          >
            <span className="sr-only">Go to next page</span>
            {">"}
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => handlePageChange(data.totalPages)}
            disabled={!data.hasNextPage}
          >
            <span className="sr-only">Go to last page</span>
            {">>"}
          </Button>
        </div>
      </div>
    </div>
  );
}

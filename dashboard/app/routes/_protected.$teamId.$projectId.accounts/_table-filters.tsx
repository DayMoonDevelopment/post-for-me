import * as React from "react";
import { useSearchParams, useSubmit } from "react-router";

import { Input } from "~/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/select";

export function TableFilters() {
  const [searchParams] = useSearchParams();
  const submit = useSubmit();

  const handleSearch = React.useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      params.delete("page"); // Reset to first page on search
      submit(params, { method: "get" });
    },
    [searchParams, submit]
  );

  const handleProviderFilter = React.useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value && value !== "all") {
        params.set("provider", value);
      } else {
        params.delete("provider");
      }
      params.delete("page"); // Reset to first page on filter
      submit(params, { method: "get" });
    },
    [searchParams, submit]
  );

  return (
    <div className="grid grid-row ">
      <div className="flex items-center gap-4">
        <div className="max-w-sm">
          <Input
            placeholder="Search..."
            defaultValue={searchParams.get("search") || ""}
            onChange={(event) => handleSearch(event.target.value)}
          />
        </div>
        <Select
          defaultValue={searchParams.get("provider") || "all"}
          onValueChange={handleProviderFilter}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="x">X (Twitter)</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="pinterest">Pinterest</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="bluesky">Bluesky</SelectItem>
            <SelectItem value="threads">Threads</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Search by username, user ID, or external ID
      </p>
    </div>
  );
}

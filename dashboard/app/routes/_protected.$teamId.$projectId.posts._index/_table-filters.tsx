import { useCallback } from "react";
import { useSearchParams, useSubmit } from "react-router";

import {
  CalendarClock4Icon,
  CircleCheckIcon,
  FileEditIcon,
  LoadingCircleIcon,
  SquareGridCircleIcon,
} from "~/components/icons";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/select";

const statusOptions = [
  { value: "all", label: "All Status", icon: SquareGridCircleIcon },
  { value: "draft", label: "Draft", icon: FileEditIcon },
  { value: "scheduled", label: "Scheduled", icon: CalendarClock4Icon },
  { value: "processing", label: "Processing", icon: LoadingCircleIcon },
  { value: "processed", label: "Processed", icon: CircleCheckIcon },
] as const;

export function TableFilters() {
  const [searchParams] = useSearchParams();
  const submit = useSubmit();

  // const handleSearch = useCallback(
  //   (value: string) => {
  //     const params = new URLSearchParams(searchParams);
  //     if (value) {
  //       params.set("search", value);
  //     } else {
  //       params.delete("search");
  //     }
  //     params.delete("page"); // Reset to first page on search
  //     submit(params, { method: "get" });
  //   },
  //   [searchParams, submit]
  // );

  const handleStatusFilter = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value && value !== "all") {
        params.set("status", value);
      } else {
        params.delete("status");
      }
      params.delete("page"); // Reset to first page on filter
      submit(params, { method: "get" });
    },
    [searchParams, submit]
  );

  // const handleSortChange = useCallback(
  //   (value: string) => {
  //     const params = new URLSearchParams(searchParams);
  //     const [sortBy, sortOrder] = value.split("-");
  //     params.set("sortBy", sortBy);
  //     params.set("sortOrder", sortOrder);
  //     params.delete("page"); // Reset to first page on sort change
  //     submit(params, { method: "get" });
  //   },
  //   [searchParams, submit]
  // );

  // const currentSort = `${searchParams.get("sortBy") || "created_at"}-${searchParams.get("sortOrder") || "desc"}`;

  return (
    <div className="flex items-center gap-4">
      {/* <Input
        placeholder="Search posts..."
        defaultValue={searchParams.get("search") || ""}
        onChange={(event) => handleSearch(event.target.value)}
        className="max-w-sm"
      /> */}
      <Select
        defaultValue={searchParams.get("status") || "all"}
        onValueChange={handleStatusFilter}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map(({ value, label, icon: Icon }) => (
            <SelectItem key={value} value={value}>
              <span className="flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" />
                {label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* <Select value={currentSort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_at-desc">Newest First</SelectItem>
          <SelectItem value="created_at-asc">Oldest First</SelectItem>
          <SelectItem value="post_at-desc">Scheduled Latest</SelectItem>
          <SelectItem value="post_at-asc">Scheduled Earliest</SelectItem>
          <SelectItem value="status-asc">Status A-Z</SelectItem>
          <SelectItem value="status-desc">Status Z-A</SelectItem>
        </SelectContent>
      </Select> */}
    </div>
  );
}

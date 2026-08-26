import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

import type { DataGridFeatures } from "~/components/data-grid/data-grid";

import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
} from "~/components/data-grid/data-grid";
import { DataGridColumnHeader } from "~/components/data-grid/data-grid-column-header";
import { DataGridPagination } from "~/components/data-grid/data-grid-pagination";
import { DataGridTable } from "~/components/data-grid/data-grid-table";
import { CirclePlusIcon } from "~/icons";
import { Badge } from "~/ui/badge";
import { Button } from "~/ui/button";
import {
  createFilterQuery,
  createFilterRule,
  type FilterField,
  type FilterQuery,
  Filters,
} from "~/ui/filters";

import { Section } from "./section";

type Member = {
  email: string;
  id: number;
  name: string;
  posts: number;
  role: string;
  status: "active" | "invited";
};

const DATA: Member[] = [
  { id: 1, name: "Ada Lovelace", email: "ada@example.com", role: "Owner", status: "active", posts: 128 },
  { id: 2, name: "Alan Turing", email: "alan@example.com", role: "Admin", status: "active", posts: 64 },
  { id: 3, name: "Grace Hopper", email: "grace@example.com", role: "Member", status: "invited", posts: 12 },
  { id: 4, name: "Katherine Johnson", email: "katherine@example.com", role: "Member", status: "active", posts: 89 },
  { id: 5, name: "Margaret Hamilton", email: "margaret@example.com", role: "Admin", status: "active", posts: 201 },
  { id: 6, name: "Barbara Liskov", email: "barbara@example.com", role: "Member", status: "invited", posts: 7 },
  { id: 7, name: "Radia Perlman", email: "radia@example.com", role: "Member", status: "active", posts: 45 },
  { id: 8, name: "Frances Allen", email: "frances@example.com", role: "Owner", status: "active", posts: 150 },
];

const columns: ColumnDef<DataGridFeatures, Member>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataGridColumnHeader title="Name" column={column} />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    size: 200,
  },
  {
    accessorKey: "email",
    header: ({ column }) => <DataGridColumnHeader title="Email" column={column} />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email}</span>
    ),
    enableSorting: false,
    size: 220,
  },
  {
    accessorKey: "role",
    header: ({ column }) => <DataGridColumnHeader title="Role" column={column} />,
    cell: ({ row }) => row.original.role,
    enableSorting: false,
    size: 120,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
    cell: ({ row }) => (
      <Badge variant={row.original.status === "active" ? "success" : "secondary"}>
        {row.original.status}
      </Badge>
    ),
    enableSorting: false,
    size: 120,
  },
  {
    accessorKey: "posts",
    header: ({ column }) => <DataGridColumnHeader title="Posts" column={column} />,
    cell: ({ row }) => row.original.posts,
    size: 100,
  },
];

const filterFields: FilterField[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "active", label: "Active" },
      { value: "invited", label: "Invited" },
    ],
  },
  {
    id: "role",
    label: "Role",
    type: "multiselect",
    options: [
      { value: "Owner", label: "Owner" },
      { value: "Admin", label: "Admin" },
      { value: "Member", label: "Member" },
    ],
  },
];

export function DataGridDemo() {
  // Manual / "server" mode: pagination + sorting live in React state, and we
  // derive the visible page slice ourselves rather than letting the table model
  // do it — mirroring a loader-backed grid.
  const [filterQuery, setFilterQuery] = useState<FilterQuery>(() =>
    createFilterQuery([
      createFilterRule({
        id: "status",
        path: ["status"],
        operator: "is",
        value: "active",
      }),
    ]),
  );
  const [sorting, setSorting] = useState<SortingState>([
    { id: "posts", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });

  const sortedData = useMemo(() => {
    const sort = sorting[0];
    if (!sort) return DATA;
    const key = sort.id as keyof Member;
    return [...DATA].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av === bv) return 0;
      const order = av > bv ? 1 : -1;
      return sort.desc ? -order : order;
    });
  }, [sorting]);

  const pageData = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return sortedData.slice(start, start + pagination.pageSize);
  }, [sortedData, pagination]);

  const table = useTable({
    features: dataGridFeatures,
    data: pageData,
    columns,
    pageCount: Math.ceil(DATA.length / pagination.pageSize),
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    manualPagination: true,
    manualSorting: true,
    getRowId: (row) => String(row.id),
  });

  return (
    <div className="space-y-8">
      <Section title="Filters">
        <Filters
          fields={filterFields}
          query={filterQuery}
          onQueryChange={setFilterQuery}
          variant="basic"
          size="sm"
          trigger={
            <Button variant="outline" size="sm">
              <CirclePlusIcon />
              Filter
            </Button>
          }
        />
      </Section>
      <Section title="Grid (manual pagination + sorting)">
        <DataGrid
          table={table}
          recordCount={DATA.length}
          tableLayout={{ rowBorder: true }}
        >
          <div className="w-full space-y-2.5">
            <DataGridContainer>
              <DataGridTable />
            </DataGridContainer>
            <DataGridPagination />
          </div>
        </DataGrid>
      </Section>
    </div>
  );
}

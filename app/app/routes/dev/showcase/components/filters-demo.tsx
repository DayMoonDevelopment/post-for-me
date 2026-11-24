import * as React from "react";

import type { SocialProvider } from "~/lib/onboarding";
import type {
  FilterChangeDetails,
  FilterField,
  FilterOption,
  FilterQuery,
} from "~/ui/filters";

import { FilterIcon, SlidersIcon } from "~/icons";
import { ALL_PLATFORMS } from "~/lib/platform-meta";
import { cn } from "~/lib/utils";
import { Button } from "~/ui/button";
import {
  countFilterRules,
  createFilterGroup,
  createFilterQuery,
  createFilterRule,
  Filters,
  flattenFilterConditions,
} from "~/ui/filters";
import { JsonBlock } from "~/ui/json-block";

import { Section } from "./section";

/** The post lifecycle, with the dot color the chip and the option row share. */
const STATUSES: { dot: string; label: string; value: string; }[] = [
  { value: "draft", label: "Draft", dot: "bg-muted-foreground" },
  { value: "scheduled", label: "Scheduled", dot: "bg-info" },
  { value: "processing", label: "Processing", dot: "bg-warning" },
  { value: "processed", label: "Processed", dot: "bg-success" },
];

const PLATFORM_OPTIONS: FilterOption[] = ALL_PLATFORMS.map((platform) => {
  const Icon = platform.icon;
  return {
    value: platform.id,
    label: platform.label,
    icon: <Icon className="size-4" />,
  };
});

/**
 * The posts schema. `select` / `multiselect` / `text` / `number` / `boolean` each
 * resolve to a built-in editor from the field's `type`; the operator catalog for
 * that type comes with them (contains / is / is any of / between / is empty …).
 */
const SCHEMA: FilterField[] = [
  {
    id: "caption",
    label: "Caption",
    type: "text",
    placeholder: "Text to match",
  },
  {
    id: "status",
    label: "Status",
    type: "select",
    searchable: false,
    options: STATUSES.map((status) => ({
      value: status.value,
      label: status.label,
      icon: (
        <span className={cn("inline-block size-2.5 rounded-full", status.dot)} />
      ),
    })),
    // The chip's value segment: overlapping dots + a count, which a bare
    // `<span>` icon in the default display would collapse inline.
    renderValue: ({ values }) => {
      const picked = STATUSES.filter((status) =>
        values.map(String).includes(status.value),
      );
      if (picked.length === 0) return null;
      return (
        <span className="flex items-center gap-1.5">
          <span className="flex items-center -space-x-0.5">
            {picked.map((status) => (
              <span
                key={status.value}
                className={cn(
                  "size-2.5 rounded-full ring-2 ring-background",
                  status.dot,
                )}
              />
            ))}
          </span>
          <span>
            {picked.length === 1 ? picked[0].label : `${picked.length} statuses`}
          </span>
        </span>
      );
    },
  },
  {
    id: "platform",
    label: "Platform",
    type: "multiselect",
    pinSelected: true,
    options: PLATFORM_OPTIONS,
    className: "w-64",
  },
  {
    id: "engagement",
    label: "Engagement",
    icon: <SlidersIcon className="size-4" />,
    // A branch: pressing it drills in. Its leaves are what get filtered on.
    fields: [
      {
        id: "reactions",
        label: "Reactions",
        fields: [
          { id: "likes", label: "Likes", type: "number" },
          { id: "comments", label: "Comments", type: "number" },
        ],
      },
      { id: "reach", label: "Reach", type: "number" },
      { id: "shares", label: "Shares", type: "number" },
    ],
  },
  {
    id: "has_media",
    label: "Has media",
    type: "boolean",
  },
];

/* -------------------------------------------------------------------------- */
/*                              Async options                                 */
/* -------------------------------------------------------------------------- */

/** A directory big enough that the options belong on the server. */
const DIRECTORY: FilterOption[] = ALL_PLATFORMS.flatMap((platform) =>
  ["acme", "acmestudio", "acmehq"].map((handle) => ({
    value: `${platform.id}:${handle}`,
    label: `${handle} · ${platform.label}`,
    data: platform.id as SocialProvider,
  })),
);

const ASYNC_SCHEMA: FilterField[] = [
  {
    id: "social_account",
    label: "Social account",
    type: "multiselect",
    className: "w-72",
    pinSelected: true,
    placeholder: "Search accounts",
    // Paged over the wire: the editor calls this with the search text and shows
    // its own loading row while the promise is in flight.
    loadOptions: (query) =>
      new Promise<FilterOption[]>((resolve) => {
        setTimeout(() => {
          const needle = query.trim().toLowerCase();
          resolve(
            DIRECTORY.filter((option) =>
              option.label.toLowerCase().includes(needle),
            ).slice(0, 8),
          );
        }, 500);
      }),
    // Restores labels for values a saved view was persisted with, so a chip
    // never has to render a raw id while the loader has not seen it.
    resolveValues: (values) =>
      DIRECTORY.filter((option) => values.includes(option.value)),
  },
  SCHEMA[1],
];

/* -------------------------------------------------------------------------- */
/*                                   Demo                                     */
/* -------------------------------------------------------------------------- */

/** A seeded query: `platform is any of (facebook, instagram)` AND `status is draft`. */
function seededQuery(): FilterQuery {
  return createFilterQuery<unknown>([
    createFilterRule({
      id: "seed-platform",
      path: ["platform"],
      operator: "has_any_of",
      value: ["facebook", "instagram"],
    }),
    createFilterRule({
      id: "seed-status",
      path: ["status"],
      operator: "is",
      value: "draft",
    }),
  ]);
}

/** The same query with a nested OR group, which only the builder can express. */
function nestedQuery(): FilterQuery {
  return createFilterQuery<unknown>([
    createFilterRule({
      id: "nested-status",
      path: ["status"],
      operator: "is",
      value: "scheduled",
    }),
    createFilterGroup({
      id: "nested-group",
      combinator: "or",
      rules: [
        createFilterRule({
          id: "nested-likes",
          path: ["engagement", "reactions", "likes"],
          operator: "gte",
          value: 100,
        }),
        createFilterRule({
          id: "nested-shares",
          path: ["engagement", "shares"],
          operator: "gte",
          value: 25,
        }),
      ],
    }),
  ]);
}

export function FiltersDemo() {
  const [basic, setBasic] = React.useState<FilterQuery>(seededQuery);
  const [advanced, setAdvanced] = React.useState<FilterQuery>(nestedQuery);
  const [inline, setInline] = React.useState<FilterQuery>(nestedQuery);
  const [collapsed, setCollapsed] = React.useState<FilterQuery>(() =>
    createFilterQuery<unknown>([
      createFilterRule({
        id: "deep",
        path: ["engagement", "reactions", "comments"],
        operator: "between",
        value: [10, 500],
      }),
    ]),
  );
  const [accounts, setAccounts] = React.useState<FilterQuery>(() =>
    createFilterQuery(),
  );
  const [guarded, setGuarded] = React.useState<FilterQuery>(seededQuery);
  const [refusal, setRefusal] = React.useState<string | null>(null);

  return (
    <div className="space-y-8">
      <Section title="Basic · the chip row (toolbar over a table)">
        {/* No children: the bar draws its own chrome for the variant — the
            add-filter trigger, the chips, and Clear once anything is set. */}
        <Filters
          fields={SCHEMA}
          query={basic}
          showClear
          size="sm"
          trigger={
            <Button variant="outline" size="sm">
              <FilterIcon />
              Filter
            </Button>
          }
          onQueryChange={setBasic}
        />
        <div className="w-full space-y-2">
          <p className="text-xs text-muted-foreground">
            <code className="font-mono">flattenFilterConditions</code> — the
            hand-off a loader turns into query params:
          </p>
          <JsonBlock value={flattenFilterConditions(basic)} />
        </div>
      </Section>

      <Section title="Advanced · the condition builder in a popover">
        {/* Same query model, a chrome that can draw `a AND (b OR c)`.
            `reorderable` adds the drag grip + Alt+ArrowUp/Down on each row. */}
        <Filters
          fields={SCHEMA}
          query={advanced}
          reorderable
          showClear
          variant="advanced"
          trigger={
            <Button variant="outline">
              <SlidersIcon />
              {countFilterRules(advanced)} conditions
            </Button>
          }
          onQueryChange={setAdvanced}
        />
      </Section>

      <Section title="Advanced · inline, where the builder IS the page">
        <div className="w-full">
          <Filters
            advancedMode="inline"
            fields={SCHEMA}
            query={inline}
            reorderable
            variant="advanced"
            onQueryChange={setInline}
          />
        </div>
      </Section>

      <Section title="Nested attributes · collapsed paths">
        {/* `pathCollapse` shortens `Engagement > Reactions > Comments` in both
            chromes, and the full path stays the control's accessible name. */}
        <Filters
          fields={SCHEMA}
          maxPathSegments={2}
          pathCollapse="middle"
          query={collapsed}
          showClear
          trigger={
            <Button variant="outline" size="sm">
              <FilterIcon />
              Add condition
            </Button>
          }
          onQueryChange={setCollapsed}
        />
      </Section>

      <Section title="Async options · loadOptions (~500ms) + resolveValues">
        <Filters
          fields={ASYNC_SCHEMA}
          query={accounts}
          showClear
          trigger={
            <Button variant="outline" size="sm">
              <FilterIcon />
              Filter accounts
            </Button>
          }
          onQueryChange={setAccounts}
        />
      </Section>

      <Section title="Guarded · onBeforeQueryChange vetoes the change">
        {/* One veto point for every write the bar makes — the chip row's Delete
            key, a drag, a nested popover. It can refuse, never rewrite. */}
        <Filters
          fields={SCHEMA}
          query={guarded}
          showClear
          size="sm"
          trigger={
            <Button variant="outline" size="sm">
              <FilterIcon />
              Filter (max 3)
            </Button>
          }
          onBeforeQueryChange={(next, details: FilterChangeDetails) => {
            if (countFilterRules(next) > 3) {
              setRefusal(details.reason);
              return false;
            }
            setRefusal(null);
          }}
          onQueryChange={setGuarded}
        />
        {refusal ? (
          <p className="w-full text-xs text-warning">
            refused <code className="font-mono">{refusal}</code> — three
            conditions is the cap.
          </p>
        ) : null}
      </Section>

      <Section title="Read-only and disabled">
        <Filters fields={SCHEMA} query={seededQuery()} readOnly size="sm" />
        <Filters fields={SCHEMA} query={seededQuery()} disabled size="sm" />
      </Section>
    </div>
  );
}

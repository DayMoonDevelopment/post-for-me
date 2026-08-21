import * as React from "react";

import type { SocialProvider } from "~/lib/onboarding";
import type { CascaderNode } from "~/ui/cascader-types";

import { AddIcon, ProjectIcon, SettingsIcon } from "~/icons";
import { platformMeta } from "~/lib/platform-meta";
import { Button } from "~/ui/button";
import {
  Cascader,
  CascaderChips,
  CascaderContent,
  CascaderEmpty,
  CascaderList,
  CascaderPanel,
  CascaderStatus,
  CascaderTrigger,
  useCascaderAnchor,
} from "~/ui/cascader";
import { CascaderColumns } from "~/ui/cascader-columns";
import { CascaderFooter } from "~/ui/cascader-footer";
import { CascaderItems } from "~/ui/cascader-item";
import {
  CascaderBreadcrumb,
  CascaderInput,
  CascaderNav,
  CascaderValue,
} from "~/ui/cascader-nav";

import { Section } from "./section";

/**
 * Compact source for the demo tree — project → platform → account, which is the
 * shape the real picker will hang off. Projected into `CascaderNode`s below
 * rather than written out as one, so 18 leaves stay readable.
 */
const SOURCE: {
  label: string;
  platforms: {
    accounts: { handle: string; label: string; }[];
    provider: SocialProvider;
  }[];
  value: string;
}[] = [
  {
    value: "launch",
    label: "Launch campaign",
    platforms: [
      {
        provider: "instagram",
        accounts: [
          { label: "Acme", handle: "@acme" },
          { label: "Acme Studio", handle: "@acmestudio" },
        ],
      },
      {
        provider: "x",
        accounts: [
          { label: "Acme HQ", handle: "@acmehq" },
          { label: "Acme Support", handle: "@acmehelp" },
        ],
      },
      {
        provider: "tiktok",
        accounts: [{ label: "Acme Shorts", handle: "@acme.shorts" }],
      },
    ],
  },
  {
    value: "evergreen",
    label: "Evergreen content",
    platforms: [
      {
        provider: "linkedin",
        accounts: [
          { label: "Acme Inc.", handle: "company/acme" },
          { label: "Acme Engineering", handle: "company/acme-eng" },
        ],
      },
      {
        provider: "facebook",
        accounts: [{ label: "Acme Page", handle: "acmepage" }],
      },
    ],
  },
  {
    value: "field-notes",
    label: "Field notes",
    platforms: [
      {
        provider: "bluesky",
        accounts: [{ label: "Acme Field", handle: "@field.acme.co" }],
      },
      {
        provider: "threads",
        accounts: [{ label: "Acme Notes", handle: "@acmenotes" }],
      },
    ],
  },
];

/** The brand mark for a provider, sized for a cascader row. */
function providerIcon(provider: SocialProvider) {
  const Icon = platformMeta(provider)?.icon;
  return Icon ? <Icon className="size-4" /> : undefined;
}

function providerLabel(provider: SocialProvider) {
  return platformMeta(provider)?.label ?? provider;
}

/** Three levels: project → platform → account. Values are the full path. */
const ACCOUNT_TREE: CascaderNode[] = SOURCE.map((project) => ({
  value: project.value,
  label: project.label,
  icon: <ProjectIcon className="size-4" />,
  children: project.platforms.map((platform) => ({
    value: `${project.value}:${platform.provider}`,
    label: providerLabel(platform.provider),
    icon: providerIcon(platform.provider),
    children: platform.accounts.map((account) => ({
      value: `${project.value}:${platform.provider}:${account.handle}`,
      label: account.label,
      description: account.handle,
    })),
  })),
}));

/* -------------------------------------------------------------------------- */
/*                              Async levels                                  */
/* -------------------------------------------------------------------------- */

/** The root level of the async demo: branches marked before their children are
 * known (`hasChildren`), with the real total already on the row (`count`). */
const ASYNC_ROOT: CascaderNode[] = SOURCE.flatMap((project) =>
  project.platforms.map((platform) => ({
    value: `async:${project.value}:${platform.provider}`,
    label: `${providerLabel(platform.provider)} · ${project.label}`,
    icon: providerIcon(platform.provider),
    hasChildren: true,
    count: platform.accounts.length,
  })),
);

const ASYNC_CHILDREN: Record<string, CascaderNode[]> = Object.fromEntries(
  SOURCE.flatMap((project) =>
    project.platforms.map((platform) => [
      `async:${project.value}:${platform.provider}`,
      platform.accounts.map((account) => ({
        value: `async:${project.value}:${platform.provider}:${account.handle}`,
        label: account.label,
        description: account.handle,
      })),
    ]),
  ),
);

/** Nothing is known up front — every level arrives from `getChildren`. */
const ASYNC_ITEMS: CascaderNode[] = [];

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

/* -------------------------------------------------------------------------- */
/*                                   Demo                                     */
/* -------------------------------------------------------------------------- */

/** Renders a committed selection under a picker, or an em dash. */
function Value({ children }: { children: string | string[]; }) {
  const text = Array.isArray(children) ? children.join(", ") : children;
  return (
    <p className="w-full text-xs text-muted-foreground">
      value: <code className="font-mono">{text || "—"}</code>
    </p>
  );
}

export function CascaderDemo() {
  const [account, setAccount] = React.useState("");
  const [accounts, setAccounts] = React.useState<string[]>([]);
  const [column, setColumn] = React.useState("");
  const [tree, setTree] = React.useState<string[]>([
    "launch:instagram:@acme",
  ]);
  const [inlineValue, setInlineValue] = React.useState("");
  const [asyncValue, setAsyncValue] = React.useState("");
  const [pressed, setPressed] = React.useState<string | null>(null);

  const chipsAnchor = useCascaderAnchor();

  return (
    <div className="space-y-8">
      <Section title="Drill mode · single select">
        <Cascader items={ACCOUNT_TREE} value={account} onValueChange={setAccount}>
          <CascaderTrigger
            aria-label="Social account"
            className="w-72 justify-between"
            render={<Button variant="outline" />}
          >
            <CascaderValue placeholder="Pick a social account" />
          </CascaderTrigger>
          <CascaderContent>
            <CascaderPanel>
              <CascaderNav>
                <CascaderInput placeholder="Search accounts..." />
              </CascaderNav>
              <CascaderBreadcrumb />
              <CascaderEmpty />
              <CascaderList>
                <CascaderItems />
              </CascaderList>
              <CascaderStatus />
            </CascaderPanel>
          </CascaderContent>
        </Cascader>
        <Value>{account}</Value>
      </Section>

      <Section title="Multi select · chips trigger (leaves only)">
        <Cascader
          multiple
          items={ACCOUNT_TREE}
          value={accounts}
          onValueChange={setAccounts}
        >
          <CascaderChips
            ref={chipsAnchor}
            aria-label="Social accounts"
            placeholder="Select accounts"
            className="w-full max-w-md"
          />
          <CascaderContent anchor={chipsAnchor}>
            <CascaderPanel>
              <CascaderNav>
                <CascaderInput placeholder="Search accounts..." />
              </CascaderNav>
              <CascaderBreadcrumb />
              <CascaderEmpty />
              <CascaderList>
                <CascaderItems />
              </CascaderList>
              <CascaderStatus />
            </CascaderPanel>
          </CascaderContent>
        </Cascader>
        <Value>{accounts}</Value>
      </Section>

      <Section title="Columns mode · the open trail side by side">
        <Cascader
          mode="columns"
          items={ACCOUNT_TREE}
          value={column}
          onValueChange={setColumn}
        >
          <CascaderTrigger
            aria-label="Account (columns)"
            className="w-72 justify-between"
            render={<Button variant="outline" />}
          >
            <CascaderValue placeholder="Browse projects" />
          </CascaderTrigger>
          <CascaderContent>
            <CascaderPanel>
              <CascaderNav>
                <CascaderInput placeholder="Search accounts..." />
              </CascaderNav>
              <CascaderEmpty />
              <CascaderColumns columnWidth={200} />
              <CascaderStatus />
            </CascaderPanel>
          </CascaderContent>
        </Cascader>
        <Value>{column}</Value>
      </Section>

      <Section title="Tree mode · cascade + indeterminate branches">
        <Cascader
          cascade
          multiple
          mode="tree"
          selectable="any"
          defaultExpanded={["launch", "launch:instagram"]}
          items={ACCOUNT_TREE}
          value={tree}
          onValueChange={setTree}
        >
          <CascaderTrigger
            aria-label="Accounts (tree)"
            className="w-72 justify-between"
            render={<Button variant="outline" />}
          >
            <CascaderValue placeholder="Select a project or account" />
          </CascaderTrigger>
          <CascaderContent>
            <CascaderPanel>
              <CascaderNav>
                <CascaderInput placeholder="Search accounts..." />
              </CascaderNav>
              <CascaderEmpty />
              <CascaderList>
                <CascaderItems />
              </CascaderList>
              <CascaderStatus />
            </CascaderPanel>
          </CascaderContent>
        </Cascader>
        <Value>{tree}</Value>
      </Section>

      <Section title="Inline panel · deep search + footer actions">
        {/* `inline` renders no popup at all, so the panel is whatever box it is
            given — a settings page, a sidebar, the Filters field picker. */}
        <Cascader
          inline
          open
          actions={[
            {
              value: "connect",
              label: "Connect a new account",
              icon: <AddIcon />,
              onSelect: () => setPressed("Connect a new account"),
            },
            {
              value: "manage",
              label: "Manage accounts",
              icon: <SettingsIcon />,
              onSelect: () => setPressed("Manage accounts"),
            },
          ]}
          items={ACCOUNT_TREE}
          maxHeight={260}
          searchScope="deep"
          value={inlineValue}
          onValueChange={setInlineValue}
          onOpenChange={() => {}}
        >
          <div className="w-full max-w-sm overflow-hidden rounded-md border border-border">
            <CascaderPanel>
              <CascaderNav>
                <CascaderInput placeholder="Search every level..." />
              </CascaderNav>
              <CascaderBreadcrumb />
              <CascaderEmpty />
              <CascaderList>
                <CascaderItems />
              </CascaderList>
              <CascaderFooter />
              <CascaderStatus />
            </CascaderPanel>
          </div>
        </Cascader>
        <Value>{inlineValue}</Value>
        {pressed ? (
          <p className="w-full text-xs text-muted-foreground">
            action pressed: <code className="font-mono">{pressed}</code>
          </p>
        ) : null}
      </Section>

      <Section title="Async levels · getChildren (~600ms per level)">
        <Cascader
          items={ASYNC_ITEMS}
          value={asyncValue}
          getChildren={async (node, { signal }) => {
            await sleep(600, signal);
            if (!node) return ASYNC_ROOT;
            return ASYNC_CHILDREN[node.value] ?? [];
          }}
          onValueChange={setAsyncValue}
        >
          <CascaderTrigger
            aria-label="Account (async)"
            className="w-72 justify-between"
            render={<Button variant="outline" />}
          >
            <CascaderValue placeholder="Load accounts on open" />
          </CascaderTrigger>
          <CascaderContent>
            <CascaderPanel>
              <CascaderNav>
                <CascaderInput placeholder="Search accounts..." />
              </CascaderNav>
              <CascaderBreadcrumb />
              {/* One element for empty, loading and error — a branch row swaps
                  its chevron for a spinner while its children are in flight. */}
              <CascaderEmpty />
              <CascaderList>
                <CascaderItems />
              </CascaderList>
              <CascaderStatus />
            </CascaderPanel>
          </CascaderContent>
        </Cascader>
        <Value>{asyncValue}</Value>
      </Section>
    </div>
  );
}

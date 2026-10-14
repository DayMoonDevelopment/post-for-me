import type { ReactNode } from "react";

import { capture } from "~/lib/analytics";

import { CodeBlock } from "../components/code-block";
import { CommandBlock } from "../components/command-block";

export const REPO = "https://github.com/DayMoonDevelopment/post-for-me";
export const NAMESPACE = "@post-for-me";
export const REGISTRY_ORIGIN = "https://ui.postforme.dev";

/** Selected base + style, threaded down so install commands track the configurator. */
export type ShowcaseContext = { base: string; style: string };

export function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** A heading that links to itself — hovering reveals a `#` anchor. */
export function Anchor({
  id,
  level,
  children,
}: {
  children: ReactNode;
  id: string;
  level: "h2" | "h3";
}) {
  const content = (
    <a href={`#${id}`} className="no-underline">
      {children}
      <span
        aria-hidden
        className="ms-2 font-normal text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
      >
        #
      </span>
    </a>
  );
  if (level === "h2") {
    return (
      <h2
        id={id}
        className="group scroll-mt-20 text-xl font-semibold tracking-tight"
      >
        {content}
      </h2>
    );
  }
  return (
    <h3 id={id} className="group scroll-mt-20 font-medium tracking-tight">
      {content}
    </h3>
  );
}

/** A titled documentation section with an anchored heading. */
export function Section({
  title,
  description,
  children,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <Anchor id={slug(title)} level="h2">
          {title}
        </Anchor>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** The page title + summary every layout opens with. */
export function DocsHeader({
  title,
  description,
}: {
  description: string;
  title: string;
}) {
  return (
    <header className="space-y-2">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-base text-muted-foreground">{description}</p>
    </header>
  );
}

/**
 * The one-time `components.json` wiring — identical for every item, so a layout
 * that repeats per-variant install commands shows this ONCE at the top instead.
 */
export function RegistryConfig({ base, style }: ShowcaseContext) {
  return (
    <CodeBlock lang="json">{`{
  "style": "${base}-${style}",
  "registries": {
    "${NAMESPACE}": "${REGISTRY_ORIGIN}/r/{style}/{name}.json"
  }
}`}</CodeBlock>
  );
}

/** A `shadcn add` command for one item, with copy analytics. */
export function InstallCommand({
  item,
  component,
  base,
  style,
  event = "install_command_copied",
}: ShowcaseContext & {
  component: string;
  event?: string;
  item: string;
}) {
  return (
    <CommandBlock
      args={`shadcn@latest add ${NAMESPACE}/${item}`}
      onCopy={(runtime) =>
        capture(event, { component, item, base, style, runtime })
      }
    />
  );
}

/** "Live preview · base-style" + a link to the source on GitHub. */
export function PreviewMeta({
  sourceFile,
  base,
  style,
}: ShowcaseContext & { sourceFile: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">
        Live preview · {base}-{style}
      </span>
      <a
        href={`${REPO}/blob/main/${sourceFile}`}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-medium underline-offset-4 hover:underline"
      >
        View source →
      </a>
    </div>
  );
}

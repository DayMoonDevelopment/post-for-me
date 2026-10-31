/*
 * Fetch shadcn's own per-style base primitives for the showcase preview.
 *
 * A shadcn "style" is a full component rewrite shipped PRE-RESOLVED per style
 * (e.g. base-mira textarea is boxed `rounded-md`; base-sera is an underlined
 * `border-b-input bg-transparent`). Tokens don't capture this — only shadcn's
 * actual per-style component does. So for a faithful preview we pull every style
 * variation of the base primitives our components compose, then render the one
 * matching the selected style.
 *
 * Output:
 *   app/showcase/primitives/<style>/<name>.tsx  — shadcn's per-style source, with
 *     `@/registry/base-<style>/lib/utils` → `~/lib/utils` and sibling `ui/*`
 *     imports → `./*` (co-located per style).
 *   app/ui/<name>.tsx  — for each DISPATCH primitive, a generated dispatcher that
 *     reads the showcase StyleContext and renders the matching per-style variant.
 *     These are showcase-only: the build never ships them (our components depend on
 *     the bare `@shadcn` primitive, which the consumer installs for their own style).
 *
 * Re-run whenever the primitive set or shadcn's per-style output changes:
 *   bun run scripts/fetch-shadcn-primitives.ts
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY = "https://ui.shadcn.com/r/styles";

// Must match STYLES in scripts/build-registry.ts and AXES.style in presets.ts.
const STYLES = [
  "vega",
  "nova",
  "maia",
  "lyra",
  "mira",
  "luma",
  "sera",
  "rhea",
] as const;

// Base shadcn primitives our components compose, plus their transitive registry
// deps (field pulls in label + separator). Add to this list when a new component
// composes another shadcn primitive.
const PRIMITIVES = [
  "accordion",
  "avatar",
  "textarea",
  "field",
  "tooltip",
  "label",
  "separator",
  "popover",
  "checkbox",
  "switch",
  "toggle",
  // command (cmdk) + its transitive per-style siblings: CommandInput wraps
  // input-group (→ button + input + textarea), CommandDialog wraps dialog (→ button).
  "command",
  "input-group",
  "dialog",
  "button",
  // button-group connects adjacent buttons into one segmented control (uses separator).
  "button-group",
  // attachment previews selected media as cards (uses button).
  "attachment",
  "input",
  // item is shadcn's list-row primitive (media / content / title / description /
  // actions / group / separator) — the connection blocks compose it rather than
  // hand-rolling a row layout. Pulls in separator (already above).
  "item",
  // tabs + card back the social-set layout variations (tabs / cards).
  "tabs",
  "card",
] as const;

// The subset our components import directly via `~/ui/*` — these get a style-aware
// dispatcher. The rest (label, separator) are only pulled in by a per-style
// primitive (field) and referenced as co-located siblings, so they need no
// dispatcher; the chrome keeps using the plain `app/ui/{label,separator}`.
const DISPATCH = [
  "accordion",
  "avatar",
  "textarea",
  "field",
  "tooltip",
  "popover",
  "checkbox",
  "switch",
  "toggle",
  "command",
  "button-group",
  "attachment",
  // item is shadcn's list-row primitive — the connection block composes it.
  "item",
  "tabs",
  "card",
  // dialog: kept available for blocks that need a modal.
  "dialog",
  // button is also used by the showcase chrome (sheet/sidebar/controls), but those
  // render OUTSIDE the preview's StyleProvider, so the dispatcher falls back to the
  // default style for them and only re-skins inside the preview. `buttonVariants` is
  // lowercase, so parseExports drops it (nothing imports it anyway).
  "button",
] as const;

// Reference style for the dispatcher's export list + prop types (every style shares
// the same API — only the class strings differ).
const REF = "mira";

async function fetchPrimitive(style: string, name: string): Promise<string> {
  const url = `${REGISTRY}/base-${style}/${name}.json`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`);
  const data = (await res.json()) as { files: { content: string }[] };
  const content = data.files?.[0]?.content;
  if (!content) throw new Error(`no file content for ${url}`);
  return content;
}

function rewriteImports(content: string, style: string): string {
  return content
    .replaceAll(`@/registry/base-${style}/lib/utils`, "~/lib/utils")
    .replace(
      new RegExp(`@/registry/base-${style}/ui/([\\w-]+)`, "g"),
      "./$1",
    )
    // shadcn's own showcase IconPlaceholder (used by checkbox's check, command's
    // search glyph, etc.) has the SAME lucide=/tabler=/… API as ours, so point it
    // at our copy — this is a preview-only rewrite; shipped items never include it.
    .replaceAll(
      "@/app/(create)/components/icon-placeholder",
      "~/ui/icon-placeholder",
    );
}

function parseExports(content: string): string[] {
  const names = new Set<string>();
  for (const m of content.matchAll(
    /export\s+(?:function|const|class)\s+(\w+)/g,
  )) {
    names.add(m[1]!);
  }
  for (const m of content.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1]!.split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name && /^[A-Z]/.test(name)) names.add(name);
    }
  }
  return [...names].sort();
}

function dispatcherSource(name: string, exports: string[]): string {
  const imports = STYLES.map(
    (s) => `import * as ${s} from "~/showcase/primitives/${s}/${name}";`,
  ).join("\n");
  const decls = exports
    .map(
      (e) => `export function ${e}(props: ComponentProps<typeof ${REF}.${e}>) {
  const s = (BY_STYLE[useShowcaseStyle()] ?? ${REF}) as typeof ${REF};
  return <s.${e} {...props} />;
}`,
    )
    .join("\n\n");
  return `"use client";
// GENERATED by scripts/fetch-shadcn-primitives.ts — do not edit by hand.
//
// Style-aware dispatcher: renders shadcn's ACTUAL per-style ${name} for the style
// selected in the showcase, so the preview matches what a consumer installs. This
// file is showcase-only — the build never ships it (our components depend on the
// bare @shadcn/${name}, resolved to the consumer's own installed primitive).
import type { ComponentProps } from "react";

import { useShowcaseStyle } from "~/showcase/style-context";
${imports}

const BY_STYLE: Record<string, typeof ${REF}> = {
${STYLES.map((s) => `  ${s},`).join("\n")}
};

${decls}
`;
}

async function main() {
  for (const style of STYLES) {
    const dir = path.join(ROOT, "app", "showcase", "primitives", style);
    await fs.mkdir(dir, { recursive: true });
    for (const name of PRIMITIVES) {
      const raw = await fetchPrimitive(style, name);
      await fs.writeFile(
        path.join(dir, `${name}.tsx`),
        rewriteImports(raw, style),
        "utf8",
      );
      console.log(`   ✅ primitives/${style}/${name}.tsx`);
    }
  }

  for (const name of DISPATCH) {
    const ref = await fs.readFile(
      path.join(ROOT, "app", "showcase", "primitives", REF, `${name}.tsx`),
      "utf8",
    );
    const exports = parseExports(ref);
    if (exports.length === 0) throw new Error(`no exports parsed for ${name}`);
    await fs.writeFile(
      path.join(ROOT, "app", "ui", `${name}.tsx`),
      dispatcherSource(name, exports),
      "utf8",
    );
    console.log(`   ✅ ui/${name}.tsx dispatcher — ${exports.join(", ")}`);
  }

  console.log(
    `\nFetched ${STYLES.length} styles × ${PRIMITIVES.length} primitives; generated ${DISPATCH.length} dispatchers.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

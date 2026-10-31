# Post for Me UI

A [shadcn](https://ui.shadcn.com) component registry that makes it faster to build UI and agentic
integrations **with [Post for Me](https://postforme.dev)**. It ships the pieces the API needs a
frontend to have — shared domain **types**, **primitives** shadcn doesn't (a status dot, social
**brand marks**), **composites** contextual to posting (a **User Avatar** with connection status, a
**Platform Avatar**, a **Caption Composer** with per-platform limits), plus **hooks/utils** for
sites and agents. Components are opinionated so a developer gets a correct, on-brand result by
default and composes from there.

Components use standard shadcn theming — semantic tokens + `--radius` — and **compose bare
`@shadcn` primitives**, so they re-skin to whatever a project picked at `/create` exactly the way
shadcn's own components do. There is no bespoke styling layer.

## Distribution

Distributed as a [namespaced shadcn registry](https://ui.shadcn.com/docs/registry/namespace) served
from `ui.postforme.dev`. Consumers register the `@post-for-me` namespace once, with their chosen
`<base>-<style>` variant in the `style` field:

```jsonc
// components.json
{
  "style": "base-vega",
  "registries": {
    "@post-for-me": "https://ui.postforme.dev/r/{style}/{name}.json"
  }
}
```

Then install any component — the `{style}` placeholder resolves to the variant:

```bash
pnpm dlx shadcn@latest add @post-for-me/user-avatar
```

## Project layout

```
scripts/build-registry.ts   # the manifest (the BASES array) + build → registry-dist/<base>-<style>/<name>.json
registry-dist/<base>-<style>/  # built, self-contained registry items (the distributed artifact)
app/
  ui/          → registry:ui         primitives (status-indicator, brand-mark) + the base shadcn parts
  components/  → registry:component   domain composites (user-avatar, platform-avatar, caption-composer)
  lib/         → registry:lib         shared types + utils (post-for-me.types.ts, .utils.ts)
  examples/    → registry:example     installable composed usages
  showcase/    the live docs gallery (localhost:3001); renders each component under any /create config
    primitives/<style>/   shadcn's actual per-style primitives, for a faithful preview (generated)
  registry-serve/          resource route: serves /r/<variant>/<name>.json (+ install counts)
```

The published item list is the **`BASES` array in `scripts/build-registry.ts`** — that is the
manifest (there is no `registry.json`). Components are style-invariant, so the per-`<style>` outputs
are identical content; the slugs exist so a consumer's `{style}` URL resolves. The per-style *look*
comes from tokens + the shadcn primitives a component composes.

## Development

```bash
bun install
bun run dev                # http://localhost:3001 — the showcase gallery
bun run typecheck
bun run registry:build     # emit registry JSON to registry-dist/ (the distributed channel)
bun run registry:primitives # refresh shadcn's per-style primitives for the preview
```

The registry JSON is served by the app at `/r/<variant>/<name>.json` (a resource route under
`app/registry-serve/`, which bundles `registry-dist/` at build time) — not as static files, so
installs can be counted. Analytics is opt-in via env vars (see `.env.example`).

## Adding a component

Author it in `app/ui/` (primitive) or `app/components/` (composite), register it in the `BASES`
array in `scripts/build-registry.ts`, run `bun run registry:build`, then add a `*-demo.tsx` and a
line in `app/showcase/components/demos.tsx`. If it composes a new base shadcn primitive, add that to
`scripts/fetch-shadcn-primitives.ts` so the preview stays faithful. See the `pfm-registry*` agent
skills for the full conventions.

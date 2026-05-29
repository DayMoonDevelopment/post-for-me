---
name: react-router-project-conventions
description: Add or modify routes in this project's React Router v7 apps — both dashboard/ and marketing/. Use when creating a new page, layout, resource/api route, or modifying any folder under dashboard/app/routes/ or marketing/app/routes/. Covers the shared modular route architecture (route.ts barrel + route.component/loader/action/meta/handle), flat-routes folder-name → URL conventions, the per-app overlays (marketing: MetadataComposer + sitemaps, read-only; dashboard: actions, auth layouts, route.handle), and common gotchas. This is the project-specific contribution layer on top of the generic react-router-framework-mode skill.
---

# React Router project conventions

Both `dashboard/` and `marketing/` are React Router v7 apps that use **flat-routes** (`flatRoutes()` in `app/routes.ts`) with the same custom modular pattern: every route folder splits its concerns across single-responsibility files, and `route.ts` is **only** a barrel export. Implementation never lives in `route.ts`.

For generic React Router v7 questions (data flow, error boundaries, navigation, framework config), defer to the `react-router-framework-mode` skill. **This skill is the project-specific overlay** — the conventions our two apps share, plus where they intentionally differ. Always `cd` into the right sibling (`dashboard/` or `marketing/`) before running commands; see the `monorepo-structure` skill.

## The one rule (both apps)

`route.ts` re-exports. It does not implement.

```ts
// route.ts — re-export only what the folder actually defines.
export { Component as default } from "./route.component";
export { loader } from "./route.loader";
export { action } from "./route.action";   // dashboard mutations
export { meta } from "./route.meta";        // marketing pages
export { handle } from "./route.handle";    // dashboard breadcrumbs/tab handles
```

Only re-export what exists. A route without a loader omits the `loader` line. Matching `.ts` vs `.tsx` on the barrel is interchangeable — match the surrounding routes.

## File responsibilities

| File | Exports | When to include |
| --- | --- | --- |
| `route.ts` (or `route.tsx`) | re-exports only | Always. Required by `flatRoutes()`. |
| `route.component.tsx` | `Component` (barrel re-exports as `default`) | Any page route. Omit only for pure resource/api routes. |
| `route.loader.ts` | `loader` | Route needs server data, dynamic params, or returns a `Response`. |
| `route.action.ts` | `action` | **Dashboard:** any mutation (forms, deletes, connects). **Marketing:** effectively unused — marketing is read-only; confirm intent before adding one. |
| `route.meta.ts` | `meta` | **Marketing:** any user-facing page, via `MetadataComposer`. Dashboard rarely needs it. |
| `route.handle.ts` | `handle` | **Dashboard:** breadcrumb/tab metadata consumed by parent layouts. |
| colocated components | route-only React components | **Marketing:** a `components/` subfolder. **Dashboard:** sibling `_name.tsx` files (underscore-prefixed so flat-routes ignores them). Promote to `~/components/` only on the second consumer. |
| `schema.ts` / `types.ts` / `utils.ts` | route-local helpers | **Dashboard:** Zod schemas, types, and helpers colocated with a complex route. |
| `content.server.md` | `import md from "./content.server.md?raw"` | **Marketing:** long-form markdown colocated with the route (legal/policy). |

## Folder-name → URL (flat-routes, both apps)

`flatRoutes()` translates folder names mechanically. Dots are path separators, `$` is a dynamic param, `[...]` escapes literals, and `_prefix` segments select layout/pathless behavior.

| Folder | URL | Notes |
| --- | --- | --- |
| `_root._index` (mktg) / `_protected._index` (dash) | `/` | Index wrapped by the named pathless layout. |
| `_root.about._index` | `/about` | Standard page. Dots nest, hyphens are literal. |
| `_root.blog.$path._index` | `/blog/:path` | `$name` = dynamic param → `params.path`. |
| `_protected.$teamId.$projectId._index` | `/:teamId/:projectId` | Nested dynamic params under a layout. |
| `_root.integrations.$integration` | `/integrations/:integration` | **No `._index`** = layout wrapper with `<Outlet />`. |
| `_root.integrations.linkedin._index` | `/integrations/linkedin` | Explicit slug **shadows** the dynamic sibling. |
| `_resource.robots[.txt]._index` | `/robots.txt` | `[.txt]` escapes the literal dot; resource route, no layout. |
| `api.stripe.webhook` | `/api/stripe/webhook` | Dashboard api route — `route.ts` re-exports only `action`. |

**Pathless layout prefixes** (the `_name` segments) differ per app:
- **Marketing:** `_root` (Navigation + Footer + Outlet), `_resource` (returns a `Response`, no layout), `resources` (its own layout tree).
- **Dashboard:** `_auth` (signed-out auth screens), `_protected` (auth-guarded app shell). `api.*` and `callback.*` are unprefixed resource routes.

## Add a new page route (checklist)

1. **Pick the folder name** using the table above. Place it under the correct app: `dashboard/app/routes/` or `marketing/app/routes/`.
2. **`route.component.tsx`** — export a `Component`. Read data with `useLoaderData<Route.ComponentProps["loaderData"]>()`, types from `./+types/route`.
3. **`route.loader.ts`** if it needs data. Import server-only modules from `~/lib/.server/*`. Type with `Route.LoaderArgs`.
4. **Dashboard mutation?** add `route.action.ts` (`Route.ActionArgs`). **Marketing page?** add `route.meta.ts` via `MetadataComposer`.
5. **`route.ts`** re-exporting `default` plus whatever you created. Nothing else.
6. **Run `bun run typecheck` in that sibling.** This generates `.react-router/types/.../+types/route.d.ts` — until you do, `./+types/route` won't resolve and every `Route.*` reference shows as an error.
7. **Verify:** `bun run dev` in the sibling, visit the URL.
8. **Marketing only:** wire the public URL into the matching `_resource.sitemap.*` loader and, if it belongs in nav/footer, touch `~/components/navigation/navigation.tsx` / `~/components/footer.tsx`.

## Marketing overlay — MetadataComposer

Always go through `MetadataComposer` from `~/lib/meta`. Never hand-roll meta arrays — the composer applies site defaults (`og:site_name`, twitter card, theme color, favicon) and emits Open Graph + Twitter + JSON-LD in one pass.

```ts
import { MetadataComposer } from "~/lib/meta";
import type { Route } from "./+types/route";

export function meta({ data }: Route.MetaArgs) {
  const m = new MetadataComposer();
  m.title = "Changelog – Post For Me";
  m.description = "Recent shipped changes to Post For Me.";
  m.canonical = "https://www.postforme.dev/changelog";
  m.contentType = "website"; // "article" for blog/resources
  return m.build();
}
```

For article-style pages also set `publishedTime`/`modifiedTime`/`author`/`image` and `m.addSchema({...})`. Canonical example: `marketing/app/routes/_root.blog.$path._index/route.meta.ts`; full setter list in `marketing/app/lib/meta/index.ts`.

## Marketing overlay — resource routes & sitemaps

Resource routes return a `Response` and have no component; the barrel re-exports only the loader. Canonical pattern: `marketing/app/routes/_resource.humans[.txt]._index/route.loader.ts`. **Any new public page must be added to the matching `_resource.sitemap.*/route.loader.ts`** — the sitemap won't pick it up on its own.

## Dashboard overlay — actions, auth, handles

- **Mutations go through `route.action.ts`** returning data or a redirect; forms POST to their own route. See `dashboard/app/routes/_protected.$teamId.$projectId.composer/route.action.ts`.
- **Auth** is enforced by the pathless layout: put signed-in pages under `_protected.*`, auth screens under `_auth.*`. The layout route does the guarding — don't re-check in each child.
- **`route.handle.ts`** supplies breadcrumb / active-tab metadata that parent layouts read via `useMatches()`.
- **Colocate** route-only pieces as underscore-prefixed siblings (`_tabs.tsx`, `_post-preview.tsx`) plus `schema.ts` / `types.ts` / `utils.ts`.

## Gotchas and anti-patterns

- **Implementation in `route.ts`.** It's a barrel. Move logic to a sibling file and re-export.
- **Importing `~/lib/.server/*` from a client component.** Vite hard-fails the build. Reach server-only utilities through a `loader`/`action`. The `.server` segment is what excludes the module from the client bundle — don't rename it.
- **Forgetting `bun run typecheck` after creating a folder.** `./+types/route` is generated, not real — every `Route.*` reference looks broken until you run it once (in the right sibling).
- **Accidentally shadowing a dynamic route.** Creating `…foo._index` next to `…$param._index` makes `/foo` bypass the dynamic route entirely (different loader/meta). Only do it when the page needs genuinely custom UI.
- **Lifting components too early.** Route-only components stay colocated; promote to `~/components/` on the second consumer, not the first.
- **Marketing:** hand-built meta arrays (use `MetadataComposer`), forgetting the sitemap entry, forgetting nav/footer, or adding a `route.action.ts` (marketing is read-only — confirm first).
- **Wrong working directory.** Run `bun run typecheck` / `dev` from inside `dashboard/` or `marketing/`, never the repo root. See `monorepo-structure`.

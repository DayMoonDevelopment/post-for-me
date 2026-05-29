---
name: monorepo-structure
description: Explains this repo's non-workspace "dumb monorepo" layout and the iron rule that every build/test/lint/typegen/package command runs from inside a sibling directory — never the repo root. Use BEFORE running any bun/npm/supabase/trigger/shadcn command, before installing or adding a dependency, before generating DB types, or whenever a skill or task says to "run X" without naming a directory. Reach for it any time you're about to shell out a command in this repo and aren't certain which directory it belongs in, or when a command fails with "no package.json / no lockfile / script not found" at the root.
---

# Monorepo structure (dumb monorepo)

`post-for-me` is a **non-workspace monorepo** — one git repo holding self-contained sibling directories. There are **no bun workspaces, no `workspace:*` deps, no shared root tooling**. The repo root has **no `package.json`, no `node_modules`, no lockfile, and no runnable scripts.** (CLAUDE.md calls this the "dumb monorepo" principle.)

```
post-for-me/
├── api/         # NestJS API + Supabase config (owns the DB/migration lifecycle)
├── trigger/     # Trigger.dev background jobs (own deploy lifecycle)
├── dashboard/   # React Router v7 dashboard app
└── marketing/   # React Router v7 marketing site
```

Each sibling owns its **own** `package.json`, scripts, dependencies, lockfile, `node_modules`, and CI surface. Skills, agent definitions, and these guidelines live at the root (`.agents/skills/`, `.claude/skills/`) and apply repo-wide — but the **code and commands** are per-sibling.

## The iron rule

**Every build/test/lint/typegen/dev/install/add command runs from INSIDE the relevant sibling — never the repo root.** `cd` into the sibling first.

Running a command at the root fails (`no package.json`, `script not found`, `no lockfile`) — or worse, silently does the wrong thing. When a skill or task says "run `bun run dev`" / "run `bunx shadcn@latest add …`" / "run the typecheck", it means *inside the sibling that owns that surface*.

```bash
# ❌ WRONG — root has no package.json / no scripts
bun run dev
bunx shadcn@latest add button
bun add some-pkg

# ✅ RIGHT — cd into the sibling first
cd dashboard && bun run dev
cd marketing && bunx shadcn@latest add button
cd api && bun add some-pkg
```

- **Never run `bun install` (or add/remove a dep) at the repo root.** The root has no deps. Install/modify deps inside the sibling that needs them; vendor a copy into each sibling that needs shared code rather than hoisting.
- **Never add a root `package.json` workspace** or a tsconfig path alias pretending to be a shared package "for convenience." Inter-sibling import resolution is forbidden; use relative imports within a sibling, vendor across siblings.

## Where each command belongs

| Sibling | Common commands (run from inside it) |
| --- | --- |
| `api/` | `bun run start:dev`; `bun run supabase:start` / `supabase:reset` / `supabase:stop`; `bun run typegen` (kanel + supabase); `bun run lint` |
| `trigger/` | `bun run dev`; `bun run deploy`; `bun run supabase:typegen`; `bun run typecheck`; `bun run lint` |
| `dashboard/` | `bun run dev` (port 5173); `bun run typecheck` (`react-router typegen && tsc`); `bun run supabase:typegen`; `bunx shadcn@latest …`; `bun run lint` |
| `marketing/` | `bun run dev`; `bun run typecheck`; `bun run supabase:typegen`; `bunx shadcn@latest …`; `bun run lint` |

When unsure which sibling owns a command, check for the `package.json` whose `scripts` define it: `ls */package.json` then look — don't guess, and don't run it at the root.

## Database / type generation

The DB schema source of truth is the SQL migrations in `api/supabase/migrations/`; `api/` owns `supabase:start` / `supabase:reset` and the migration lifecycle. **Each consumer generates its OWN `Database` types** against the running local Supabase — there is no `cp` of generated artifacts between siblings.

- `api/` → `bun run supabase:typegen` → `api/supabase/supabase.types.ts`
- `dashboard/` → `bun run supabase:typegen` → `app/lib/.server/database.types.ts`
- `trigger/` → `bun run supabase:typegen` → `supabase.types.ts`

Schema-change workflow: (1) add a migration in `api/supabase/migrations/`; (2) `cd api && bun run supabase:reset`; (3) in each consumer that touches the changed tables, `cd <sibling> && bun run supabase:typegen`. The local Supabase must be running (started from `api/`) for the consumer typegens to work.

## For skill authors

Any skill that emits a shell command **must** name the sibling it runs in, or prefix it with the `cd`. Never write a bare `bun run …` / `bunx …` that an agent could execute from the repo root. When in doubt, link back to this skill.

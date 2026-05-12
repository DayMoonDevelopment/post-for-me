# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository model

`post-for-me` is a "dumb" monorepo: one git repo containing self-contained sibling directories. There are **no bun workspaces, no `workspace:*` deps, no shared root tooling**. Each sibling owns its own `package.json`, scripts, dependencies, lockfile, and CI surface.

```
post-for-me/
├── api/             # NestJS API + Supabase config
│   ├── src/         # NestJS source (uses `api/src/supabase/` for the Nest module)
│   └── supabase/    # DB config, migrations, types, seed (the supabase project)
├── trigger/         # Trigger.dev background jobs (own deploy lifecycle)
├── dashboard/       # React Router v7 dashboard
└── marketing/       # React Router v7 marketing site
```

### Conventions

- **Do not run `bun install` at the repo root.** Root has no deps.
- **Do not add a root `package.json` workspace** to "share" anything between siblings. If two siblings need the same code, vendor a copy into each. The dumb-monorepo principle is non-negotiable.
- **Do not create a workspace alias for "convenience"** (e.g. tsconfig path mapping pretending to be an npm package). Use relative imports. Inter-sibling resolution is forbidden.
- **Each sibling has its own `node_modules`, lockfile, scripts, and CI surface.**
- **Each sibling generates its own DB types** via its own `supabase:typegen` script. No `cp` of generated artifacts between siblings.

## Working on a sibling

Always `cd` into the sibling first.

### API (`api/`)
- `bun run start:dev` — NestJS dev server (port 3000)
- `bun run supabase:start` / `supabase:reset` / `supabase:stop` — local DB lifecycle
- `bun run supabase:typegen` — regen Supabase types → `./supabase/supabase.types.ts`
- `bun run kanel:typegen` — regen Kysely types (Stripe schema)
- `bun run typegen` — runs both kanel and supabase typegen
- `bun run lint`

### Trigger (`trigger/`)
- `bun run dev` — Trigger.dev local jobs runner (`trigger.dev dev`)
- `bun run deploy` — Deploy jobs to trigger.dev cloud (`trigger.dev deploy`)
- `bun run supabase:typegen` — regen Supabase types → `./supabase.types.ts` (needs local Supabase running from `api/`)
- `bun run typecheck`
- `bun run lint`

### Dashboard (`dashboard/`)
- `bun run dev` — React Router dev (port 5173)
- `bun run supabase:typegen` — regen Supabase types → `app/lib/.server/database.types.ts` (needs local Supabase running from `api/`)
- `bun run typecheck` — `react-router typegen && tsc`
- `bun run lint`

### Marketing (`marketing/`)
- `bun run dev` — React Router dev
- `bun run typecheck` — `react-router typegen && tsc`
- `bun run lint`

## Architecture overview

### API (`api/`)

- **Framework**: NestJS with TypeScript
- **Database**: Supabase (PostgreSQL) with generated types in `api/supabase/supabase.types.ts`
- **Authentication**: Unkey API key management with custom auth guard
- **Core modules**:
  - `social-posts/` — create/manage social media posts
  - `media/` — file uploads and media processing
  - `social-provider-connections/` — OAuth connections to social platforms
  - `social-post-results/` — track posting results and analytics
  - `auth/` — API key authentication and user decorators
  - `supabase/` — Nest module wrapping the Supabase client (note: distinct from the `supabase/` config dir at `api/supabase/`)

### Trigger (`trigger/`)

- **Platform**: Trigger.dev v3
- **Config**: `trigger/trigger.config.ts`
- **Deploy lifecycle**: independent of `api/` — ships via `trigger.dev deploy` to trigger.dev cloud
- **Database access**: uses the same Supabase service-role client; consumes the `Database` type from `trigger/supabase.types.ts`, regenerated locally via `bun run supabase:typegen` against the local Supabase instance started by `api/`
- **Key jobs**:
  - `post-to-platform.ts` — publish to social platforms
  - `process-post.ts` — validate post content
  - `process-scheduled-posts.ts` — cron job that fans scheduled posts out to `process-post`
  - `ffmpeg-process-video.ts` — video processing with FFmpeg
  - `supabase-media-cleanup.ts` — cleanup unreferenced media

### Dashboard (`dashboard/`)

- **Framework**: React Router v7 with TypeScript
- **UI**: Shadcn/ui components with Tailwind CSS v4
- **State**: React Hook Form with Zod validation
- **Icons**: vendored copy of the former `icons/` workspace package in `app/components/icons/`
- **Database types**: regenerated locally via `bun run supabase:typegen` → `app/lib/.server/database.types.ts` (needs local Supabase running from `api/`)

### Marketing (`marketing/`)

- **Framework**: React Router v7 marketing site
- **UI**: Shadcn/ui components with Tailwind CSS v4
- **Content**: Markdown-based content management with private CMS read endpoints on the API

### Database (`api/supabase/`)

- **Platform**: Supabase (hosted PostgreSQL)
- **Migrations**: `api/supabase/migrations/`
- **Types**: Auto-generated in `api/supabase/supabase.types.ts` (source of truth)
- **Seed Data**: `api/supabase/seed/`

## Key architectural patterns

### Authentication flow
- API uses Unkey for API key management
- Custom `@Protect()` decorator for route protection
- `@User()` decorator extracts user info from API keys
- Frontend uses Supabase Auth with SSR support

### Database access
- API uses `@SupabaseClient()` decorator for database access
- Type-safe queries with generated Supabase types from `api/supabase/`
- Row Level Security (RLS) policies enforce data access

### Cross-sibling type sharing
- **DB schema source of truth**: SQL migrations in `api/supabase/migrations/`. `api/` owns `supabase:start` / `supabase:reset` and the migration lifecycle.
- **Each consumer generates its own `Database` types** against the running local Supabase. No `cp` between siblings.
  - `api/`: `bun run supabase:typegen` → `api/supabase/supabase.types.ts` (includes `public`, `cms`, `graphql_public`)
  - `dashboard/`: `bun run supabase:typegen` → `app/lib/.server/database.types.ts` (just `public` — narrowed to what dashboard queries)
  - `trigger/`: `bun run supabase:typegen` → `supabase.types.ts` (just `public`)
- Each consumer has a minimal `supabase/config.toml` declaring `project_id = "post-for-me"` and `[db] port = 54322` so the CLI targets the same local instance api started.
- **Schema change workflow**:
  1. Add migration in `api/supabase/migrations/`
  2. `cd api && bun run supabase:reset` — apply migrations + seed locally
  3. In each consumer that touches the changed tables, run `bun run supabase:typegen`

## Key dependencies

- **Runtime**: Bun (package manager and runtime)
- **Database**: Supabase with generated TypeScript types
- **Background jobs**: Trigger.dev v3 with Node.js runtime
- **Authentication**: Unkey API key management
- **UI**: Radix UI primitives with Tailwind CSS v4
- **Validation**: Zod schemas with class-validator for API

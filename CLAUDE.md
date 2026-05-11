# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository model

`post-for-me` is a "dumb" monorepo: one git repo containing self-contained sibling directories. There are **no bun workspaces, no `workspace:*` deps, no shared root tooling**. Each sibling owns its own `package.json`, scripts, dependencies, lockfile, and CI surface.

```
post-for-me/
├── api/             # NestJS API + Trigger.dev jobs + Supabase
│   ├── src/         # NestJS source (uses `api/src/supabase/` for the Nest module)
│   ├── trigger/     # Trigger.dev background jobs
│   └── supabase/    # DB config, migrations, types, seed (the supabase project)
├── dashboard/       # React Router v7 dashboard
└── marketing/       # React Router v7 marketing site
```

### Conventions

- **Do not run `bun install` at the repo root.** Root has no deps.
- **Do not add a root `package.json` workspace** to "share" anything between siblings. If two siblings need the same code, vendor a copy into each. The dumb-monorepo principle is non-negotiable.
- **Do not create a workspace alias for "convenience"** (e.g. tsconfig path mapping pretending to be an npm package). Use relative imports. Inter-sibling resolution is forbidden.
- **Each sibling has its own `node_modules`, lockfile, scripts, and CI surface.**

## Working on a sibling

Always `cd` into the sibling first.

### API (`api/`)
- `bun run start:dev` — NestJS dev server (port 3000)
- `bun run trigger:dev` — Trigger.dev local jobs runner
- `bun run supabase:start` / `supabase:reset` / `supabase:typegen` — local DB lifecycle
- `bun run typegen` — Kysely types (Stripe schema)
- `bun run test` / `test:e2e` — Jest suites
- `bun run lint`

### Dashboard (`dashboard/`)
- `bun run dev` — React Router dev (port 5173)
- `bun run typecheck` — `react-router typegen && tsc`
- `bun run test` — Vitest
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
- **Job processing**: Trigger.dev jobs in `api/trigger/`
- **Core modules**:
  - `social-posts/` — create/manage social media posts
  - `media/` — file uploads and media processing
  - `social-provider-connections/` — OAuth connections to social platforms
  - `social-post-results/` — track posting results and analytics
  - `auth/` — API key authentication and user decorators
  - `supabase/` — Nest module wrapping the Supabase client (note: distinct from the `supabase/` config dir at `api/supabase/`)

### Dashboard (`dashboard/`)

- **Framework**: React Router v7 with TypeScript
- **UI**: Shadcn/ui components with Tailwind CSS v4
- **State**: React Hook Form with Zod validation
- **Vendored from former workspace deps**: icons in `app/components/icons/`, Supabase Database types in `app/lib/.server/database.types.ts`

### Marketing (`marketing/`)

- **Framework**: React Router v7 marketing site
- **UI**: Shadcn/ui components with Tailwind CSS v4
- **Content**: Markdown-based content management with private CMS read endpoints on the API

### Database (`api/supabase/`)

- **Platform**: Supabase (hosted PostgreSQL)
- **Migrations**: `api/supabase/migrations/`
- **Types**: Auto-generated in `api/supabase/supabase.types.ts`
- **Seed Data**: `api/supabase/seed/`

### Background jobs (`api/trigger/`)

- **Platform**: Trigger.dev v3
- **Config**: `api/trigger.config.ts`
- **Key files**:
  - `post-to-platform.ts` — publish to social platforms
  - `process-post.ts` — validate post content
  - `ffmpeg-process-video.ts` — video processing with FFmpeg

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
- The `Database` type for Supabase is **vendored** into each consumer:
  - Source of truth: `api/supabase/supabase.types.ts` (regenerated via `bun run supabase:typegen` inside `api/`)
  - Dashboard copy: `dashboard/app/lib/.server/database.types.ts`
- When the schema changes, copy the regenerated types into the dashboard:
  - `cp api/supabase/supabase.types.ts dashboard/app/lib/.server/database.types.ts`

## Testing

- **API**: Jest unit tests, Supertest integration tests
- **Frontend**: Vitest for components and utilities
- **E2E**: Jest configuration for API endpoints

## Key dependencies

- **Runtime**: Bun (package manager and runtime)
- **Database**: Supabase with generated TypeScript types
- **Background jobs**: Trigger.dev v3 with Node.js runtime
- **Authentication**: Unkey API key management
- **UI**: Radix UI primitives with Tailwind CSS v4
- **Validation**: Zod schemas with class-validator for API

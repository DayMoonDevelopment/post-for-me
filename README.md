# Post for Me

A modern social media automation platform built with NestJS, React Router, and Supabase. Post For Me allows users to schedule and automate posts across multiple social media platforms including Twitter/X, Bluesky, and more.

**[Visit Post for Me →](https://www.postforme.dev)**

## Repository layout

This repo is a "dumb" monorepo: each surface is a self-contained sibling directory with its own `package.json`, deps, scripts, lockfile, and CI surface. There are no shared workspaces, no `workspace:*` deps, and no root-level package management.

```
post-for-me/
├── api/             # NestJS API + Supabase config
│   ├── src/         # NestJS source
│   └── supabase/    # DB config, migrations, types, seed
├── trigger/         # Trigger.dev background jobs (own deploy lifecycle)
├── dashboard/       # React Router v7 dashboard app
├── marketing/       # React Router v7 marketing site
└── .github/         # Singular CI/CD that targets the right sibling per change
```

> **Why "dumb"?** Co-locating code in one repo gives us singular CI/CD and easy cross-sibling navigation, but each sibling stays self-contained so it can be installed, run, tested, and deployed without root involvement. No shared `package.json` and no inter-package resolution — just sibling apps that happen to live next to each other.

## Working on a sibling

Pick the sibling you want to work on, `cd` into it, and use its scripts. **Do not run `bun install` at the repo root** — it will install nothing useful, and there's no root tooling.

### API (`api/`)

```bash
cd api
bun install
bun run start:dev          # NestJS, port 3000
bun run supabase:start     # Local Supabase
bun run supabase:reset     # Reset local DB + apply migrations + seed
bun run supabase:typegen   # Regenerate Supabase types → ./supabase/supabase.types.ts
bun run kanel:typegen      # Regenerate Kysely types (Stripe schema)
bun run typegen            # Runs both kanel + supabase typegen
bun run test
bun run lint
```

### Trigger (`trigger/`)

```bash
cd trigger
bun install
bun run dev                # trigger.dev dev (local jobs runner)
bun run deploy             # trigger.dev deploy (push to trigger.dev cloud)
bun run supabase:typegen   # Regenerate Supabase types → ./supabase.types.ts (needs api's local Supabase running)
bun run typecheck
bun run lint
```

### Dashboard (`dashboard/`)

```bash
cd dashboard
bun install
bun run dev                # React Router, port 5173
bun run supabase:typegen   # Regenerate Supabase types → app/lib/.server/database.types.ts (needs api's local Supabase running)
bun run typecheck
bun run test
bun run lint
```

### Marketing (`marketing/`)

```bash
cd marketing
bun install
bun run dev                # React Router
bun run typecheck
bun run lint
```

## Tech stack

### Backend (`api/`)
- **Framework**: NestJS with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Unkey API key management

### Background jobs (`trigger/`)
- **Platform**: Trigger.dev v3
- **Database access**: vendored `Database` type from `api/supabase/`
- **Deploy**: independent of `api/` via `trigger.dev deploy`

### Frontend (`dashboard/`, `marketing/`)
- **Framework**: React Router v7 with TypeScript
- **Styling**: Tailwind CSS v4
- **UI**: Shadcn/ui

## Prerequisites

- [Bun](https://bun.sh) v1.3.3 or later
- Supabase CLI (installed as a dev dep inside `api/`)

## License

This project is owned fully by Day Moon Development LLC — see the package.json files for details.

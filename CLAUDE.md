# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Root level (runs all services):**

- `bun run dev` - Start API, Dashboard, and Trigger.dev concurrently
- `bun run lint` - Lint all packages
- `bun run typecheck` - Type check all packages
- `bun supabase:typegen` - Generate Supabase types from local database

**Individual services:**

- `bun run dev:api` - Start NestJS API (port 3000)
- `bun run dev:dashboard` - Start React Router dashboard (port 5173)
- `bun run dev:trigger` - Start Trigger.dev for background jobs

**Database:**

- `bun run dev:init` - Reset Supabase database and regenerate types
- `supabase db reset` - Reset local database with migrations and seed data
- `cd api && bun run typegen` - Regenerate Kysely types for the `stripe` schema (run locally after any migration that changes that schema; output in `api/src/kysely/types/` is committed to git and consumed by CD/Docker without re-running kanel)

**API-specific (in api/ directory):**

- `bun run test` - Run Jest tests
- `bun run test:e2e` - Run end-to-end tests
- `bun run start:prod` - Start production server

**Frontend-specific (in dashboard/ and marketing/ directories):**

- `bun run test` - Run Vitest tests
- `react-router build` - Build for production

## Architecture Overview

This is a monorepo social media automation platform with 5 main components:

### API (`api/`)

- **Framework**: NestJS with TypeScript
- **Database**: Supabase (PostgreSQL) with generated types
- **Authentication**: Unkey API key management with custom auth guard
- **Job Processing**: Trigger.dev for background tasks
- **Core Modules**:
  - `social-posts/` - Create and manage social media posts
  - `media/` - Handle file uploads and media processing
  - `social-provider-connections/` - OAuth connections to social platforms
  - `social-post-results/` - Track posting results and analytics
  - `auth/` - API key authentication and user decorators
  - `supabase/` - Database client and service

### Dashboard (`dashboard/`)

- **Framework**: React Router v7 with TypeScript
- **UI**: Shadcn/ui components with Tailwind CSS v4
- **State**: React Hook Form with Zod validation
- **Features**: Multi-tenant project management, social account connections, post composer

### Marketing (`marketing/`)

- **Framework**: React Router v7 for marketing site
- **UI**: Shadcn/ui components with Tailwind CSS v4
- **Content**: Markdown-based content management

### Database (`supabase/`)

- **Platform**: Supabase (hosted PostgreSQL)
- **Migrations**: Located in `supabase/migrations/`
- **Types**: Auto-generated in `supabase/supabase.types.ts`
- **Seed Data**: Located in `supabase/seed/`

### Background Jobs (`trigger/`)

- **Platform**: Trigger.dev v3
- **Jobs**: Post processing, media handling, scheduled posts
- **Key Files**:
  - `post-to-platform.ts` - Publish posts to social platforms
  - `process-post.ts` - Process and validate post content
  - `ffmpeg-process-video.ts` - Video processing with FFmpeg

### Icons (`icons/`)

- Shared React icon components used across dashboard and marketing
- Commercial icon library wrapper
- Import via: `import { IconName } from "icons"`

## Key Architectural Patterns

### Authentication Flow

- API uses Unkey for API key management
- Custom `@Protect()` decorator for route protection
- `@User()` decorator extracts user info from API keys
- Frontend uses Supabase Auth with SSR support

### Database Access

- API uses `@SupabaseClient()` decorator for database access
- Type-safe queries with generated Supabase types
- Row Level Security (RLS) policies enforce data access

### Social Platform Integration

- Modular platform clients in `trigger/posting/platforms/`
- OAuth flows handled in `social-provider-connections/`
- Each platform has dedicated DTOs and validation

### Media Processing

- File uploads via Supabase Storage
- Video processing with FFmpeg through Trigger.dev
- Sharp for image optimization

## Testing Approach

- **API**: Jest for unit tests, Supertest for integration tests
- **Frontend**: Vitest for components and utilities
- **E2E**: Jest configuration for API endpoints

## Key Dependencies

- **Runtime**: Bun (package manager and runtime)
- **Database**: Supabase with generated TypeScript types
- **Background Jobs**: Trigger.dev v3 with Node.js runtime
- **Authentication**: Unkey API key management
- **UI**: Radix UI primitives with Tailwind CSS v4
- **Validation**: Zod schemas with class-validator for API

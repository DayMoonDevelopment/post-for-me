# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

**Package Manager:** This project uses **bun** as the package manager and runtime. Always use `bun` instead of `npm` or `yarn`.

```bash
# Package Management
bun install              # Install dependencies
bun add <package>        # Add a package
bun remove <package>     # Remove a package

# Development
bun run dev              # Start dev server at http://localhost:5173
bun run build            # Build for production
bun run start            # Start production server

# Code Quality
bun run typecheck        # Run type checking (generates types + tsc)
bun run lint             # Lint TypeScript/TSX files
bun run lint:fix         # Fix linting issues automatically

# Testing
bun run test             # Run tests once
bun run test:watch       # Run tests in watch mode
```

## Architecture

### Framework & Routing

- **React Router v7** with SSR enabled (server-side rendering)
- File-based routing using `@react-router/fs-routes` with flat routes structure
- Routes in `app/routes/` follow naming convention:
  - `_root._index` → `/` (homepage)
  - `_root.pricing._index` → `/pricing`
  - `_resource.sitemap[.xml]._index` → `/sitemap.xml` (resource routes don't use layout)
- Route types auto-generated in `.react-router/types/` (regenerate with `bun run typecheck`)
- Underscore prefixes (`_root`, `_resource`) indicate layout routes or special route types

### Path Aliases

```typescript
// tsconfig paths (baseUrl: ".")
"~/*" → "./app/*"
```

### Styling

- **Tailwind CSS v4** with Vite plugin (`@tailwindcss/vite`)
- Global styles in `app/app.css`
- Shadcn/ui components with "new-york" style, using Central Icons
- Component config in `components.json` with aliases: `~/components`, `~/ui`, `~/lib`, `~/hooks`

### Icon System

- Primary icons from `@central-icons/outlined` and `@central-icons/filled`
- Auto-generated icon documentation in `ICONS.md` (1674+ icons available)
- Postinstall script (`scripts/generate-icons-docs.js`) updates icon docs from `icons-index.json`
- Custom social media brand icons/logos in `app/components/` (e.g., `facebook-logo.tsx`, `x-brand-icon.tsx`)
- Import pattern: `import { IconHome } from '@central-icons/outlined'`

### SEO & Metadata

- **MetadataComposer** class (`app/lib/meta/index.ts`) for structured metadata generation
- Automatically generates Open Graph, Twitter cards, and schema.org JSON-LD
- Helper methods: `createFAQSchema()`, `createCollectionPageSchema()`, `createItemListSchema()`
- Default site URL: `https://www.postforme.dev`
- Set title/description/canonical, call `.build()` to generate full meta array

### Analytics & Tracking

- **PostHog** integration via `app/providers/posthog-provider.tsx`
- Loaded in root layout with API key/host from env vars
- Additional integrations: Crisp (chat). Blog/resources content is read from the Post for Me API's private namespace (`/private/cms/*`) which is scoped to a dedicated Unkey API and not exposed in the public OpenAPI spec.
- All API keys loaded via root loader and injected as `<script>` tags

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# PostHog Analytics
POST_HOG_API_KEY=
POST_HOG_API_HOST=

# Crisp Chat
CRISP_WEBSITE_ID=

# Post for Me API (private namespace for CMS reads)
POST_FOR_ME_API_URL=    # Base URL, e.g. https://api.postforme.dev
POST_FOR_ME_API_KEY=    # Unkey key granted `cms.read`
```

**Note:** The app will run without these variables, but analytics, chat, and blog features will be disabled.

### Content Management

- Constants in `app/lib/constants.ts`: `API_URL`, `APP_URL`, `GITHUB_URL`
- Product information: `PRODUCT.md` (product overview, features, pricing)
- Copywriting guide: `COPYWRITING.md` (voice, tone, style guidelines)
- Important: Follow developer-first tone from `COPYWRITING.md` - specific not vague, benefits before features, no marketing fluff
- **Blog/Resources**: Fetched from the Post for Me API's private namespace (`/private/cms/*`) via `app/lib/.server/cms.ts` query builder, authenticated with `POST_FOR_ME_API_KEY` (an Unkey key granted the `cms.read` permission). Base URL comes from `POST_FOR_ME_API_URL`. Types live in `app/lib/.server/cms-types.ts`.
- **Solutions**: Type-safe data in `app/lib/.server/data/solutions.*.ts` files
- **Comparisons**: Competitor comparison pages in `app/lib/.server/data/comparisons.*.ts`
- **FAQ**: Structured data in `app/lib/.server/data/faq.ts`

**Server-only code:** Files in `.server` directories are automatically excluded from client bundles by React Router v7.

### UI Components

- Shadcn/ui components in `app/ui/` (button, card, dialog, drawer, etc.)
- Custom components in `app/components/` (navigation, footer, logo, social icons, code blocks)
- Navigation components: `app/components/navigation/navigation.tsx` with config-driven structure
- Shared components: `app/components/footer.tsx`, `app/components/get-started.tsx`

### Code Syntax Highlighting

- **Shiki** for code blocks with transformers (`@shikijs/transformers`)
- Code block component: `app/components/code-block/`

### Animation

- **Motion** (v12) for animations - optimized with `optimizeDeps.include: ["motion"]`

### SSR Configuration

- PostHog and motion configured for SSR via `vite.config.ts` with `ssr.noExternal`

## Important Development Notes

### When Working with Routes

**Modular Route Architecture:**
This codebase uses a unique modular pattern for React Router v7 routes:

- **Each route module is in its own file:**
  - `route.loader.ts` → exports named `loader`
  - `route.action.ts` → exports named `action`
  - `route.meta.ts` → exports named `meta`
  - `route.component.tsx` → exports named `Component`
  - etc.

- **The main `route.ts` acts as a barrel export:**
  ```typescript
  // route.ts
  export { Component as default } from './route.component.tsx';
  export { loader } from './route.loader';
  export { action } from './route.action';
  export { meta } from './route.meta';
  ```

- **Important:** React Router v7 file-based routing requires all component/supporting modules be exported from the `route.ts`, but we ONLY use `route.ts` for re-exporting. Never put implementation in `route.ts`.

- Route types available via `Route` import from `./+types/[route-name]`
- Meta tags: Use `MetadataComposer` for consistency, not manual meta arrays

### When Working with Icons

- Check `ICONS.md` for available icons before creating custom ones
- Use Central Icons (@central-icons/outlined or /filled) as primary icon library
- Social media icons already exist as components in `app/components/`

### When Adding Content

- Follow `COPYWRITING.md` style guide: developer-first, specific numbers, no hype
- Platform name order: TikTok, Facebook, Instagram, X, LinkedIn, Pinterest, Bluesky, Threads, YouTube
- Use proper capitalization: OAuth (not oauth), REST API, SDK, GitHub

### Build & Deployment

- Production builds go to `build/` directory
- SSR enabled by default (`react-router.config.ts`)
- Optimized for Vercel deployment (also supports Netlify, Amplify, etc.)

## Project Context

This is the marketing site for **Post For Me** - a unified API for social media integrations across 9 platforms. Key aspects:

- **Target users**: Developers, technical founders, product teams
- **Value proposition**: Ship integrations in hours not weeks, single API replaces dozens
- **Pricing**: $10/mo (1K posts) to $1,000/mo (200K posts), usage-based
- **Key differentiators**: 9 platforms, open source, developer-first, transparent pricing

Refer to `PRODUCT.md` for product details when writing marketing copy or features.

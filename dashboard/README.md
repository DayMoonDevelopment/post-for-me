# Post For Me Dashboard

The web dashboard for Post For Me - a social media automation platform that enables users to create, schedule, and publish content across multiple social media platforms.

## Features

- 🚀 **Multi-Platform Publishing** - Support for Facebook, Instagram, TikTok, LinkedIn, Twitter/X, YouTube, and Bluesky
- 👥 **Multi-Tenant Projects** - Organize social accounts and content by project
- 📝 **Rich Post Composer** - Create posts with text, images, videos, and platform-specific formatting
- 📅 **Content Scheduling** - Schedule posts for optimal engagement times
- 📊 **Analytics Dashboard** - Track post performance and engagement metrics
- 🔗 **OAuth Integration** - Secure social account connections with platform APIs
- 🎨 **Modern UI** - Built with Shadcn/ui components and Tailwind CSS v4
- 🔒 **Type-Safe** - Full TypeScript support with Supabase generated types
- ⚡️ **Server-Side Rendering** - Fast loading with React Router v7

## Architecture

- **Framework**: React Router v7 with TypeScript
- **UI Components**: Shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom design system
- **Authentication**: Supabase Auth with SSR support
- **Database**: Supabase PostgreSQL with Row Level Security
- **API Integration**: NestJS API with Unkey authentication
- **State Management**: React Hook Form with Zod validation
- **Testing**: Vitest for unit and component tests

## Getting Started

### Prerequisites

This dashboard is part of a monorepo. Make sure you have the following running:

1. **Supabase** - Local database instance
2. **API Server** - NestJS API on port 3000
3. **Environment Variables** - Copy `.env.example` to `.env.local`

### Installation

From the project root, install dependencies:

```bash
bun install
```

### Development

Start the dashboard development server:

```bash
# From project root (recommended - starts all services)
bun run dev

# Or start just the dashboard
bun run dev:dashboard
```

The dashboard will be available at `http://localhost:5173`.

### Proxying The Dev Server To A Public URL (Allowed Hosts)

If you proxy your local Vite dev server to a public URL (e.g. ngrok / Cloudflare Tunnel), Vite will reject requests whose `Host` header isn\'t explicitly allowed.

Set `ALLOWED_HOST` to the hostname(s) of your public URL:

```env
# Single host
ALLOWED_HOST=my-tunnel.ngrok-free.app

# Multiple hosts (comma or whitespace separated)
# ALLOWED_HOST=my-tunnel.ngrok-free.app,dev.example.com

# Subdomain wildcard (allows example.com and any subdomain)
# ALLOWED_HOST=.example.com
```

Notes:
- Prefer an explicit list; `ALLOWED_HOST=true` / `*` will allow any host and is not recommended.
- You can put `ALLOWED_HOST=...` in `.env.local` or export it in your shell before running `bun run dev` / `bun run dev:dashboard`.

### Environment Setup

Create a `.env.local` file with:

```env
# App Config
API_URL=http://localhost:3000

# Supabase
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_PUBLISHABLE_KEY=your_stripe_pk
STRIPE_SECRET_KEY=your_stripe_sk
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_API_PRODUCT_ID=main_stripe_product_id
STRIPE_CREDS_ADDON_PRODUCT_ID=credentials_addon_stripe_product_id

# Unkey
UNKEY_ROOT_KEY=your_unkey_root_key
UNKEY_API_ID=your_unkey_api_id

LOOPS_API_KEY=your_loops_api_key
LOOPS_INVITE_TRANSACTION_ID=your_loops_invite_email_id
```

## Building for Production

Create a production build:

```bash
bun run build
```

## Testing

Run the test suite:

```bash
# Run tests once
bun run test

# Watch mode for development
bun run test:watch
```

## Code Quality

```bash
# Lint code
bun run lint

# Fix linting issues
bun run lint:fix

# Type checking
bun run typecheck
```

## Deployment


### Platform Deployment

The dashboard can be deployed to:
- Vercel (recommended for React Router apps)
- Netlify
- AWS Amplify
- Google Cloud Run
- Railway
- Fly.io

Make sure to set the appropriate environment variables for your deployment platform.

## Project Structure

```
dashboard/
├── app/
│   ├── components/     # Reusable UI components
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utilities and configurations
│   ├── providers/     # Context providers
│   ├── routes/        # Page components and routing
│   └── ui/            # Shadcn/ui components
├── public/            # Static assets
└── build/             # Production build output
```

## Contributing

1. Follow the existing code style and patterns
2. Write tests for new features
3. Update documentation as needed
4. Ensure all checks pass before submitting PRs

---

Built with ❤️ using React Router v7, Supabase, and modern web technologies.

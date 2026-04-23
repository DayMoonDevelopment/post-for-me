# Post For Me API

The backend API for Post For Me - a social media automation platform that enables users to create, schedule, and publish content across multiple social media platforms.

## Description

A robust NestJS API that provides secure endpoints for social media content management, platform integrations, and user authentication. Built with TypeScript, Supabase, and modern security practices.

## Features

- 🔐 **API Key Authentication** - Secure authentication using Unkey
- 🌐 **Multi-Platform Support** - Integrations with Facebook, Instagram, TikTok, LinkedIn, Twitter/X, YouTube, and Bluesky
- 📝 **Content Management** - Create, update, and schedule social media posts
- 📁 **Media Handling** - Upload and process images and videos with automatic optimization
- 🔗 **OAuth Integration** - Secure social account connections with platform APIs
- 📊 **Analytics Tracking** - Post performance metrics and engagement data
- 🏢 **Multi-Tenant Architecture** - Project-based organization with team collaboration
- ⚡️ **Background Jobs** - Async processing with Trigger.dev integration
- 🛡️ **Type Safety** - Full TypeScript support with Supabase generated types
- 📚 **API Documentation** - Interactive Scalar API documentation

## Architecture

- **Framework**: NestJS with TypeScript
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Unkey API key management with custom guards
- **Background Jobs**: Trigger.dev for async processing
- **Media Storage**: Supabase Storage with CDN
- **Documentation**: Scalar for interactive API docs
- **Testing**: Jest for unit tests, Supertest for integration tests

## Core Modules

- **`social-posts/`** - Create and manage social media posts
- **`media/`** - Handle file uploads and media processing
- **`social-provider-connections/`** - OAuth connections to social platforms
- **`social-post-results/`** - Track posting results and analytics
- **`auth/`** - API key authentication and user decorators
- **`supabase/`** - Database client and service integration

## Project Setup

### Prerequisites

1. **Supabase** - Local database instance running
2. **Environment Variables** - Copy `api/.env.example` to `.env` (repo root) when running via root scripts / Docker
3. **Unkey** - API key management service configured

### Installation

From the project root :

```bash
bun install --frozen-lockfile
```

### Environment Configuration

Create a `.env` file (recommended: in the repo root) with:

```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_JWT_SECRET=your_jwt_secret

# Authentication
UNKEY_ROOT_KEY=your_unkey_root_key
UNKEY_API_ID=your_unkey_api_id

DASHBOARD_APP_URL=http://localhost:5173

TRIGGER_SECRET_KEY=your_trigger_secret
```

## Development

```bash
# Start API development server (from project root)
bun run dev:api

# Or start all services
bun run dev

# API-specific commands (from api/ directory)
bun run start:dev    # Watch mode
bun run start        # Standard mode

# Production mode (recommended: from project root)
bun run --filter=@post-for-me/api start:prod
```

The API will be available at `http://localhost:3000` with interactive documentation at `http://localhost:3000/docs`.

## Build (Production)

From the project root:

```bash
# install deps for the whole monorepo
bun install --frozen-lockfile

# build just the API package
bun run --filter=@post-for-me/api build

# run the compiled API (Node runtime)
bun run --filter=@post-for-me/api start:prod
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

## API Endpoints

### Authentication

All endpoints require an API key in the `Authorization` header:

```
Authorization: Bearer your_api_key
```

### Core Endpoints

- **`POST /social-posts`** - Create a new social media post
- **`GET /social-posts`** - List posts with pagination and filtering
- **`PUT /social-posts/:id`** - Update an existing post
- **`DELETE /social-posts/:id`** - Delete a post

- **`POST /media/upload`** - Upload media files (images/videos)
- **`GET /media/:id`** - Retrieve media metadata

- **`POST /social-provider-connections`** - Create OAuth connection
- **`GET /social-provider-connections`** - List connected accounts
- **`DELETE /social-provider-connections/:id`** - Remove connection

- **`GET /social-post-results`** - Retrieve post analytics and metrics

### Pagination

List endpoints support both cursor and offset pagination.

- Cursor pagination is preferred for performance.
- If `cursor` and `offset` are both provided, the API always uses `cursor`.
- The response includes `meta.next_cursor` for the next keyset page.
- `meta.next` is generated using cursor pagination when a cursor is present.
- `count` is still returned for compatibility.

### Documentation

Interactive API documentation is available at `/docs` when running the server.

## Social Platform Integrations

### Supported Platforms

- **Facebook** - Pages and personal profiles
- **Instagram** - Business and creator accounts
- **TikTok** - Business accounts via TikTok for Business API
- **LinkedIn** - Company pages and personal profiles
- **Twitter/X** - Personal and business accounts
- **YouTube** - Channel management and video uploads
- **Bluesky** - Personal accounts via AT Protocol

### OAuth Flow

1. Client requests authorization URL from `/social-provider-connections/auth-url`
2. User completes OAuth flow on platform
3. Platform redirects to callback with authorization code
4. Client exchanges code for access token via `/social-provider-connections/callback`
5. Connection is stored securely with encrypted credentials

## Background Jobs

The API integrates with Trigger.dev for background processing:

- **Post Publishing** - Async posting to social platforms
- **Media Processing** - Video transcoding and image optimization
- **Scheduled Posts** - Time-based post publishing
- **Analytics Collection** - Periodic metrics gathering
- **Cleanup Tasks** - Temporary file and expired token cleanup

## Security Features

- **API Key Authentication** - Managed by Unkey with rate limiting
- **Row Level Security** - Database-level access control
- **Encrypted Credentials** - Social platform tokens encrypted at rest
- **Input Validation** - Zod schemas with class-validator
- **CORS Configuration** - Restricted origins for production
- **Request Logging** - Comprehensive audit trails

## Database Schema

Key tables:

- **`users`** - User accounts and profiles
- **`teams`** - Team/organization management
- **`projects`** - Multi-tenant project organization
- **`social_posts`** - Post content and metadata
- **`social_provider_connections`** - OAuth connections
- **`social_post_results`** - Analytics and performance data
- **`media`** - File uploads and processing status

## Deployment

### Docker Deployment

```bash
# build from the monorepo root (uses api/Dockerfile)
docker build -f api/Dockerfile -t post-for-me-api .

# run (pass env vars however you manage them)
docker run --rm -p 3000:3000 --env-file .env post-for-me-api
```

### Environment Variables

Ensure all required environment variables are set in your deployment platform:

- Database credentials
- Social platform API keys
- Unkey configuration
- Trigger.dev settings

## Project Structure

```
api/
├── src/
│   ├── auth/                    # Authentication guards and decorators
│   ├── lib/                     # Shared utilities and configurations
│   ├── media/                   # File upload and processing
│   ├── social-posts/            # Post management endpoints
│   ├── social-provider-connections/  # OAuth and platform connections
│   ├── social-post-results/     # Analytics and metrics
│   ├── supabase/               # Database client and services
│   ├── app.module.ts           # Main application module
│   └── main.ts                 # Application bootstrap
```

## Contributing

1. Follow NestJS conventions and patterns
2. Write comprehensive tests for new features
3. Update API documentation for endpoint changes
4. Ensure all security checks pass
5. Test OAuth flows with actual platform credentials

---

Built with ❤️ using NestJS, Supabase, and modern API development practices.

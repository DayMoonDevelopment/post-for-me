# Post for Me

A modern social media automation platform built with NestJS, React Router, and Supabase. Post For Me allows users to schedule and automate posts across multiple social media platforms including Twitter/X, Bluesky, and more.

test
**[Visit Post for Me →](https://www.postforme.dev)**

## 🏗️ Architecture

This is a monorepo containing:

- **API** (`api/`) - NestJS backend with REST API and job scheduling
- **Dashboard App** (`dashboard/`) - React Router v7 frontend for user management
- **Marketing Site** (`marketing/`) - React Router v7 frontend for marketing the service
- **Database** - Supabase (PostgreSQL) for data persistence

## 🚀 Tech Stack

### Backend (API)

- **Framework**: NestJS with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Job Processing**: Trigger.dev
- **Authentication**: Unkey API

### Frontend (Dashboard & marketing)

- **Framework**: React Router with TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn UI

### Icons (shared icons)

Icons is a collection of icons used across the project. These icons come from a paid service that gives us access to the SVG's for commercial use.

The local package is a wrapper around the icons to make them easier to use as React components in the projects.

```ts
// from your components

import { MyIcon } from "icons";

...
```

## 📋 Prerequisites

- [Bun](https://bun.sh) v1.1.29 or later
- Node.js 18+ (for compatibility)

## ⚙️ Setup

1. **Clone the repository**

```bash
git clone https://github.com/DayMoonDevelopment/post-for-me.git
cd post-for-me
```

2. **Install dependencies**

```bash
bun install
```

3. **Environment Configuration**

   Set up environment variables for both API and Dashboard:
   - Copy `.env.example` files in each app directory
   - Configure Supabase, social media API keys, and other required services

4. **Database Setup**

   Initialize your Supabase database with the required schema (migrations should be provided in the project).

```bash
bun supabase start
bun supabase db reset
```

## 🛠️ Development

### Start all services

```bash
bun run dev
```

This runs both the API and Dashboard concurrently.

### Start individual services

**API only (port 3000)**

```bash
bun run dev:api
```

**Dashboard only (port 5173)**

```bash
bun run dev:dashboard
```

## 📝 Available Scripts

### Root Level

- `bun run dev` - Start both API and Dashboard
- `bun run lint` - Lint all packages
- `bun run typecheck` - Type check all packages

### API (`apps/api/`)

- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run start:dev` - Start development server with watch mode
- `bun run test` - Run tests
- `bun run lint` - Lint API code

### Dashboard (`apps/dashboard/`)

- `bun run build` - Build for production
- `bun run dev` - Start development server
- `bun run start` - Start production server
- `bun run test` - Run tests
- `bun run lint` - Lint dashboard code

### Marketing (`marketing/`)

- `bun run build` - Build for production
- `bun run dev` - Start development server
- `bun run start` - Start production server
- `bun run test` - Run tests
- `bun run lint` - Lint dashboard code

## 🗂️ Project Structure

````
post-for-me/
├── api/
│   ├── src/                # Source code
│   ├── test/               # Tests
│   └── dist/               # Built files
├── dashboard/
│   ├── app/                # App routes and components
│   ├── public/             # Static assets
│   └── build/              # Built files
├── marketing/
│   ├── app/                # App routes and components
│   ├── public/             # Static assets
│   └── build/              # Built files
├── icons/
│   ├── icons/              # Icon components
│   └── index.ts            # Root-level export
├── package.json            # Root package configuration
└── README.md
```

## 📄 License

This project is owned fully by Day Moon Development LLC - see the package.json files for details.
````

# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## E2E tests

Playwright tests live in `e2e/`. They run against a real local Supabase + API — there's no mocking layer — so both must be running first:

```bash
cd api && bun run supabase:start   # local Supabase (Postgres, Auth, Mailpit)
cd api && bun run start:dev        # local NestJS API on :3000
```

Then, from `app/`, with `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `API_URL` in `.env` pointed at that local stack:

```bash
bun run test:e2e         # headless
bun run test:e2e:ui      # Playwright's UI mode — time-travel through each step
bun run test:e2e:headed  # real browser window, slowed down so you can watch it
bun run test:e2e:debug   # Playwright Inspector — step through action by action
```

### Watching the tests run

`test:e2e:ui` is the one to reach for most of the time: it shows the spec list, a
DOM snapshot per action, network, and console, and it re-runs on file change.
`test:e2e:headed` is for when you want to see the actual browser drive the real
app — it pins `--workers=1` (parallel headed runs fight over window focus) and
sets `E2E_SLOWMO=300`, a 300ms pause before every action. Override the pace with
`E2E_SLOWMO=1000 bun run test:e2e:headed`, or add `--headed` to any other command
for full-speed. Any slow-motion run gets a 180s per-test timeout instead of 90s.

Narrow to one spec or test the usual way — `bun run test:e2e:headed
e2e/tests/login.spec.ts -g "logs in"`. Note that global setup launches its own
short-lived headless browser purely to serialize a cookie jar to
`e2e/.auth/user.json`; it never navigates, so there's nothing to watch there.

`playwright.config.ts` starts the app for you — the dev server locally, and a real production build (`bun run build && bun run start`) when `CI` is set, because Vite's dev-time dependency discovery is not safe against a cold `node_modules/.vite` (see the comment on `webServer`). Global setup seeds one fixed test account (`e2e-login@postforme.test` by default, override via `E2E_TEST_EMAIL`) and mints an authenticated `storageState` other specs can reuse via `test.use({ storageState: "e2e/.auth/user.json" })` instead of re-driving the login UI.

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.

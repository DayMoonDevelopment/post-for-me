# e2e — Post for Me end-to-end suite

Real, end-to-end tests for the **Post for Me product surface**: the public REST
API *and* the client SDKs we publish. Every test fires an actual request at a
running API and asserts on the real response — no mocks, no in-process harness.

This is a **polyglot umbrella** — each sub-suite is a self-contained project
with its own native toolchain. The root `Makefile` is the single entry point.

```
e2e/
├── Makefile         # orchestrator — make test / test-rest / test-sdk-node
├── lib/             # shared TypeScript: env loading (used by rest/ and sdk/node/)
├── .env.example     # document API_BASE_URL + PFM_API_KEY
├── rest/            # raw HTTP tests — every public REST endpoint, black-box
│   ├── package.json     # standalone Node project (no post-for-me dep)
│   ├── jest.config.ts
│   ├── tsconfig.json
│   ├── global-setup.ts
│   └── lib/             # http client + fixtures
└── sdk/
    └── node/        # the same surface, driven through the `post-for-me` npm client
        ├── package.json     # standalone Node project (post-for-me dep here)
        ├── jest.config.ts
        ├── tsconfig.json
        ├── global-setup.ts
        └── lib/             # SDK client wrapper + helpers
```

## Setup

The suite has **no default target** — you must tell it where to run.

1. Copy `.env.example` → `e2e/.env.local` (git-ignored, auto-loaded by both
   `rest/` and `sdk/node/`) and fill in:

   ```sh
   API_BASE_URL=http://localhost:3000     # or https://api.postforme.dev
   PFM_API_KEY=<a real Post for Me API key>
   ```

   The demo keys in `api/.env.local` (`LOCAL_DEV_UNKEY_DEMO_KEY`,
   `PRODUCTION_UNKEY_DEMO_KEY`) are good candidates for `PFM_API_KEY`.

2. Install dependencies for all sub-suites:

   ```sh
   make install   # runs bun install in rest/ and sdk/node/
   ```

3. If targeting **local**, start the API first: `cd ../api && bun run start:dev`.

## Running

```sh
make test              # the whole surface — REST + SDK (Node)
make test-rest         # just the raw-HTTP REST tests
make test-sdk-node     # just the Node SDK tests
make test-sdk          # alias for test-sdk-node (add more SDK targets here later)
```

Run a single suite by path filter from the sub-project directory:

```sh
cd rest     && bun run test -- webhooks
cd sdk/node && bun run test -- social-posts
cd rest     && bun run typecheck
cd sdk/node && bun run typecheck
```

Each sub-project's `globalSetup` resolves the target, hard-fails fast with a
clear message if `API_BASE_URL` / `PFM_API_KEY` are missing, and pings
`/healthcheck` so a misconfigured target is obvious immediately.

## Coverage

### REST (`rest/`) — every public endpoint

| Suite | Endpoints |
| --- | --- |
| `healthcheck` | `GET /healthcheck` |
| `media` | `POST /v1/media/create-upload-url` |
| `social-accounts` | `POST`, `GET`, `GET /:id`, `PATCH /:id`, `POST /auth-url`, `POST /:id/disconnect` |
| `social-posts` | `POST`, `GET`, `GET /:id`, `PUT /:id`, `DELETE /:id` |
| `social-post-results` | `GET`, `GET /:id` |
| `social-post-previews` | `POST /v1/social-post-previews` |
| `social-account-feeds` | `GET /v1/social-account-feeds/:id` |
| `webhooks` | `POST`, `GET`, `GET /:id`, `PATCH /:id`, `DELETE /:id` |

### SDK (`sdk/node/`) — the `post-for-me` npm client

| Suite | Methods |
| --- | --- |
| `media` | `client.media.createUploadURL()` |
| `social-accounts` | `create`, `list`, `retrieve`, `update`, `createAuthURL`, `disconnect` |
| `social-posts` | `create`, `list`, `retrieve`, `update`, `delete` |
| `social-post-results` | `list`, `retrieve` |
| `social-account-feeds` | `list` |

> **The SDK surface is smaller than the REST API.** `post-for-me@2.x` does not
> expose `webhooks` or `social-post-previews`, so those are REST-only here. If a
> future SDK release adds them, drop new files into `sdk/node/`.

### A note on "coverage"

Jest's `--coverage` instruments local source that runs **in-process**. These
tests hit a remote API (and a remote-calling SDK), so source-level coverage is
meaningless. What matters is **surface coverage** — one `it()` per REST endpoint
and per SDK method, listed above — and Jest's verbose reporter is the report.

## How the suite stays self-contained & safe

- **Self-bootstrapping.** Suites that need data create it — via raw HTTP in
  `rest/`, via the SDK in `sdk/`. Dummy social accounts use fake tokens and are
  never used to publish.
- **Drafts only.** Posts are created with `isDraft: true`; the API never
  actually publishes to a social platform.
- **Cleans up.** Created posts/webhooks are deleted by their own test (with an
  `afterAll` safety net). Dummy social accounts can't be deleted via the public
  API, so they're left disconnected and reused (upserted) on the next run.
- **Serial.** `maxWorkers: 1` — REST and SDK suites mutate shared remote data.

## Environment-dependent endpoints

Fired for real, but they accept the documented gated outcomes (the tests assert
the call is *reachable & authenticated*, not that external state exists):

- **`social-accounts` auth-url** — needs provider app credentials configured
  for the target project. Defaults to `bluesky` (needs none). Override with
  `PFM_TEST_AUTH_PLATFORM`.
- **`social-account-feeds`** — the API gates this on the key's plan being
  `new_pricing` and the account being truly connected. Set
  `PFM_TEST_FEED_ACCOUNT_ID` to a real connected account for a full assertion.
- **`POST`/`PUT` on social-posts & social-accounts** — these fan out to
  trigger.dev (`PROCESS_WEBHOOK_TASK`); the target environment needs
  `TRIGGER_SECRET_KEY` configured or they surface a real 500.

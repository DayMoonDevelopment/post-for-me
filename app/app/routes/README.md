# Routes

Flat-routes (`flatRoutes()`), modular per-folder (`route.ts` is a barrel only).
Full conventions: the `react-router-project-conventions` skill.

## Access-control GROUPS are directories; UI layers are pathless layouts inside

Each top-level dir under `app/routes/` is an access-control group with its own
flat-routes namespace, composed in `app/routes.ts`: `protected/`, `guest/`,
`public/`, and dev-only `dev/`. A group's gate is its `route.ts` (+
`route.middleware.ts`) at the group root, applied via `layout()` and excluded
from the scan (it's a wrapper, never a leaf). Public has no gate, so no wrapper.

Within a group, naming is still flat (dotted) — directories are for access
grouping, NOT route nesting. Presentation layers are pathless layouts inside the
group, one per CONTEXT the page operates in: `protected/_project.*` are the
pages that read a PROJECT as context (playground, accounts, posts, API keys,
webhooks, project settings), and `protected/_team.*` are the pages whose context
is the TEAM itself and that need no project (billing today). Data/action routes
sit at the group root (`protected/api.*`, `protected/redirect.*`, …) so they
don't load either shell. (Future onboarding chrome → a sibling
`protected/_chromeless.*`.) The `protected` gate is middleware-only — it renders
children through a default `<Outlet>`; the `_project` / `_team` layouts supply
the chrome.

Both shells share their chrome: `~/components/shell` owns the `AppShell`
compound family (container, pinned header, content region, footer), the
`ContextSwitcher` (one dropdown body, a per-context trigger slot), and the nav
parts; `loadShellData()` in `app/lib/.server/shell.ts` owns their common loader
data. A shell layout supplies only its own nav and any wrapper it alone needs
(`_project` wraps `OnboardingProvider` around `AppShell`).

## Routes are namespaced by FUNCTION

A route's namespace declares its **kind** (and response contract); the HTTP
method follows from it. Resources are addressed by id in the path
(`teams.$teamId`, `projects.$projectId`). Authed data routes live at the
`protected/` group root (e.g. `protected/redirect.teams.$teamId.checkout`) so
they inherit its auth middleware while keeping the URL as
`/redirect/teams/$teamId/checkout`.

| Namespace | Method | `route.ts` exports | Returns | Auth |
| --- | --- | --- | --- | --- |
| `protected/_project.*` / `protected/_team.*` (pages) | GET | `default` (+ `loader`) | a component | `protected` gate middleware |
| `guest/*` / `public/*` | GET | `default` | a component | group gate middleware |
| `protected/api.*` | GET read / POST mutate | `loader` / `action` | **data** (`{…}`) | `protected` mw + `requireTeamMember` |
| `protected/redirect.*` | **POST** | `action` → `redirect()` | 302 (often off-origin) | `protected` mw + `requireTeamMember` |
| `protected/callback.*` | **GET** | `loader` → `redirect()` | process external return → 302 | `protected` mw + `requireTeamMember` |
| `webhook.*` | POST | `action` | 200 / 4xx | signature (ungated group) |

The same op is exposed through the namespace that fits — billing has
`redirect/teams/$teamId/checkout` (POST → Stripe, with a `<fetcher.Form>` spinner)
and `api/teams/$teamId/checkout` (`{ url }` as data), both calling the one
`createBillingDestination()` in `app/lib/.server/stripe/billing.ts`. Stripe
Checkout's `success_url` returns to `callback/teams/$teamId/checkout` (named for
the action it completes — only new customers; existing customers use the portal
and return to `/`).

**A `webhook.*` route is `webhook.<provider>.<context>` — one purpose, one
outcome, one Stripe endpoint, one signing secret.** Never a provider-wide
dispatcher: `POST /webhook/stripe/subscription-access` revokes/restores a team's
API keys as its subscription changes (interim, see
`app/lib/.server/subscription-access/README.md`), and `POST
/webhook/stripe/customer-link` binds a Stripe customer to its team. Each route
subscribes to only the events its outcome needs and ignores the rest with a 200.
Shared plumbing (signature verification) lives in
`app/lib/.server/stripe/webhook.ts`; what an event MEANS stays in the route.

## The rules

- **Op lives in `app/lib/.server/…`; routes are thin adapters.** Start an op
  route-local in `route.action.ts`; lift it to a `.server` function once a 2nd
  surface needs it, then expose it through the right namespace(s). (The data
  analog of "promote a component to `~/components/` on the 2nd consumer.")
- **Auth comes from the `protected/` group gate** (every route in the group
  inherits its middleware); read the user from `currentUserContext`, and add
  `requireTeamMember(context, teamId)` for the not-a-member 403. `requireUser` is
  only for a data route placed OUTSIDE `protected/`. `webhook.*` lives in an
  ungated group (signature, no session).
- **User-triggered redirects are POST** so a `<fetcher.Form>` can show a spinner
  while the server resolves the destination; **callbacks are GET** (the external
  system picks the method).
- **Failures toast; they don't take over the screen** (throwing → boundary is for
  404s / unrenderable pages only). Two paths into the global `<Toaster>`:
  - **Navigations** (`redirect.*`/`callback.*`): the route ALWAYS redirects —
    never returns data. On failure `return redirectBackWithError(request, msg, { returnTo })`
    (`~/lib/.server/flash`) → 302 back to the origin with a one-time flash cookie;
    the root loader reads+clears it and `App` toasts it.
  - **Fetcher data** (`api.*`): return `actionError(msg)` (`~/lib/action-result`);
    the component calls `useActionErrorToast(fetcher)` (`~/hooks/use-action-error-toast`).
  - Message = the `.server` failure's `Response.statusText`.
- **Active team/project = the id in the URL.** A `last_active_team` cookie
  (`app/lib/.server/active-team.ts`) is only for the bare-entry redirect; the
  switcher writes it and navigates, never holding the selection in React state.

# Spec — split the app shell into project and team contexts

Status: **proposed**. Supersedes the single `_project` layout.

## Problem

One sidebar serves two different scopes, and the code pays for it in three places.

**The ambiguity has its own hooks.** `useActiveTeamId` exists only to guess which
team a page belongs to, and its doc comment records the bug that forced it:
team-scoped pages carry no `projectId`, so without a special case they fall
through to the first team and show the wrong org while you're looking at another
one's billing. That's a workaround for a structural problem, not a feature.

**Billing is misfiled.** It sits in the `setup` nav group between API Keys and
Webhooks — both project-scoped — while being the only team-scoped page in the
app. The group label says "Setup"; the link changes what you're billed.

**The header is project-centric.** `ProjectSwitcher` owns the sidebar header, and
team affordances are bolted onto its dropdown. That's why the "Billing & usage"
row shipped without a `Link` around it: it isn't a first-class destination in a
sidebar that has no notion of team context.

The cost of fixing this only goes up. Today there is exactly **one** team-scoped
route. Members, team settings, and a cross-project view are all coming.

## Model — full context swap, driven by the URL

Two sidebars. The URL decides which one you get; there is no client state to
desync.

**The path segment IS the layout.** No pathless `_project`-style prefix: since
every project page lives under `/projects/:projectId` and every team page under
`/teams/:teamId`, `projects/route.tsx` and `teams/route.tsx` become the layouts
directly and flat-routes nests their children automatically. One less concept,
and the layout boundary is legible from the URL alone.

```
/projects/:projectId/*   →  project sidebar
/teams/:teamId/*         →  team sidebar
```

```
TEAM CONTEXT               PROJECT CONTEXT
┌───────────────────┐      ┌───────────────────┐
│ ◇ Acme Inc     ▾  │      │ ◆ Website      ▾  │
├───────────────────┤      ├───────────────────┤
│ TEAM              │      │ ⌂ Home            │
│ ▤ Billing & usage │      │                   │
│ ⚉ Members         │      │ SOCIAL POSTING    │
│ ⚙ Team settings   │      │ ▶ Playground      │
├───────────────────┤      │ ⚇ Accounts        │
│ PROJECTS          │      │ ✉ Posts           │
│ ◆ Website         │      │                   │
│ ◆ Mobile app      │      │ SETUP             │
│ ◆ Client X        │      │ ⚙ Settings        │
│ + New project     │      │ ⚿ API keys        │
└───────────────────┘      │ ⇄ Webhooks        │
                           └───────────────────┘
```

**The projects list replaces a back button.** A "← Back to Website" link only
returns you where you came from. Listing every project returns you *and* lets you
cross-jump, and it makes the team context a real hub rather than a detour. No
back affordance is specified.

## Route structure

Two real layouts inside `protected/`, replacing `_project`. No pathless prefix.

```
protected/
  projects/                                  ← LAYOUT: shell + project nav
  projects.$projectId._index
  projects.$projectId.api-keys._index
  projects.$projectId.playground._index
  projects.$projectId.settings._index
  projects.$projectId.social-accounts._index
  projects.$projectId.social-posts._index
  projects.$projectId.webhooks._index
  projects.$projectId.webhooks.$webhookId._index

  teams/                                     ← LAYOUT: shell + team nav
  teams.$teamId._index                       ← NEW (see open question 1)
  teams.$teamId.billing._index               ← moved, URL unchanged

  _index                                     ← `/` — no layout (see below)
```

`/teams/:teamId/billing` keeps its path, so Stripe return URLs and the portal
`return_url` are unaffected. `api.*`, `redirect.*`, and `callback.*` stay at the
group root — they never loaded the shell and don't now.

### The three prefix-less pages

`social-accounts/:id`, `social-posts/:id`, and `social-post-results/:id` are
project-scoped but carry no project in the URL, so they don't nest under
`projects/` and would lose the shell.

**Recommendation: move them under the project prefix.**

```
projects.$projectId.social-accounts.$socialAccountId._index
projects.$projectId.social-posts.$socialPostId._index
projects.$projectId.social-post-results.$socialPostResultId._index
```

This isn't just tidiness. Being prefix-less is what forces two pieces of
machinery to exist:

- `useRouteProjectId` reads `projectId` out of loader data because the URL lacks
  it — the last of the three ambiguity hooks.
- `app/lib/.server/api/resource-project.ts` does **a Supabase lookup on every
  request** to these pages, purely to recover the project id the URL should have
  carried. Its own file comment names this as the reason.

Putting the project in the path deletes both — one hook and one database
round-trip per page load.

The cost is a URL change on three detail pages. Nothing external links to them
(the `/v1/...` references in the codebase are API endpoints, not app routes), so
the blast radius is internal `<Link>`s. `api.social-accounts.$id.tokens` also
uses the resolver and would keep needing it unless it moves too.

### `/` has no layout

`_index` redirects to the last-active project when one exists, and otherwise
renders the onboarding setup context. Neither case wants project chrome — a
redirect renders nothing, and onboarding is its own surface. Leaving it outside
both layouts is correct, not an oversight.

## What gets extracted

Both layouts need identical chrome and identical loader data. Neither may own it.

| Moves to | What |
| --- | --- |
| `app/components/app-shell/` | `SidebarShell` (provider + inset + pinned header + scroll region), `NavSection`, `NavUser`, `NavExternal`, `NavTop` |
| `app/lib/.server/shell-data.ts` | `loadShellData()` — user profile, teams-with-projects, `sidebar_state` cookie. Called by both layout loaders |
| `protected/projects/components/` | `ProjectSidebar`, `ProjectSwitcher` |
| `protected/teams/components/` | `TeamSidebar`, `TeamSwitcher`, projects quicklink list |

`PostHogIdentifier` belongs in the shared shell — it registers the `team` billing
group, which both contexts need. `OnboardingProvider` does not: it configures the
first project's credential model, which is meaningless in team context.

The `ErrorBoundary` pattern is duplicated per layout deliberately. It re-renders
its own chrome around a page error, and the two chromes now differ.

## What happens to the hooks

| Hook | Fate |
| --- | --- |
| `useActiveTeamId` | **Reduced to a lookup.** The `routeTeamId` precedence branch — the whole reason it exists — disappears, because team pages no longer render the project sidebar. What remains is "the team owning this project", needed only for the project sidebar's entry point into team context. |
| `useRouteTeamId` | **Deleted.** Under `_team`, `params.teamId` is guaranteed. |
| `useRouteProjectId` | **Deleted** if the three detail pages move under the project prefix; otherwise kept as-is. It exists only to recover a `projectId` the URL doesn't carry. |

## Open questions

1. **Bare `/projects` and `/teams`** — both now exist as layout roots. Redirect
   to the last-active one, or 404? And does `/teams/:teamId` redirect to
   `/billing` or get an overview page? Redirects are cheaper now and don't
   foreclose the pages later.
2. **Move the three detail pages under the project prefix?** Recommended above —
   it deletes a hook and a per-request lookup, at the cost of changed URLs.
3. **Entry point from project → team.** The project sidebar needs one door into
   team context. Options: keep it in the `ProjectSwitcher` dropdown (where
   "Billing & usage" lives today), or add a persistent team crumb above the
   project switcher. The crumb is more discoverable; the dropdown is less chrome.
4. **Cookies.** `LAST_ACTIVE_TEAM_COOKIE` / `LAST_ACTIVE_PROJECT_COOKIE` drive
   `/`'s redirect. Should entering team context update the team cookie, and
   should leaving it restore the last project?
5. **Collapsed rail.** In icon mode the team sidebar's projects list has no good
   glyph story — each project would be an avatar. Acceptable, or does the list
   collapse to a single "Projects" entry?
6. **Team switcher scope.** Does switching teams from team context land on the
   same page for the new team (`/teams/:newId/billing`), or on its hub?

## Migration order

Each step is independently shippable and verifiable.

1. **Extract the shared shell and loader** with `_project` still the only layout.
   Pure refactor — no visible change. Verify the app renders as before.
2. **Add the `teams/` layout**, move the billing route into it, build
   `TeamSidebar` with the projects quicklinks. Both layouts now exist; billing is
   the only team page.
3. **Add the `projects/` layout** and drop the `_project.` prefix from every
   project page, stripping team affordances down to the single entry point
   (open question 3).
4. **Move the three detail pages** under the project prefix, then delete
   `useRouteProjectId` and the `resource-project` lookups they forced.
5. **Delete `useRouteTeamId`, reduce `useActiveTeamId`** to the owning-team lookup.
6. **Update `app/routes/README.md`** — its presentation-layer section names
   `_project` explicitly and describes pathless layouts as the pattern. After
   this, the pattern is "the path segment is the layout."

> Keep specs and docs OUT of the group directories (`protected/`, `guest/`,
> `public/`, `dev/`). Flat-routes scans everything inside them and will try to
> parse a `.md` file as a route module. `app/routes/*.md` is safe.

## Out of scope

Building the Members and Team settings **pages**. This spec creates the place
they go and the nav that points at them; the pages themselves are separate work.
No billing behaviour changes.

# Error handling (PFM-761)

One error currency (`AppException`), one classification axis (`ErrorKind`), and a
thin set of converters that turn a caught error into the surface each route
namespace already uses. Third-party errors (Supabase, Stripe) are **normalized
into `AppException` at the service boundary** with their original context preserved —
never sniffed for provider codes at the call site.

## The model

- **`AppException`** (`exceptions.ts`) — the base type: the shared shape +
  behavior, NestJS-`HttpException`-style. It's thrown as one of the semantic
  subclasses (`ForbiddenException`, `NotFoundException`, `ConflictException`,
  `ValidationException`, `UnauthorizedException`, `TooManyRequestsException`,
  `UpstreamException`, `InternalException`) — each only pins its `kind`. Two
  messages, on purpose:
  - `message` (the `Error.message`) is **internal** — provider detail, for logs.
  - `publicMessage` is **user-safe** — what a toast / the boundary shows.
  - `cause` preserves the original error; `context` holds structured log data
    (ids, provider code…). **Neither ever crosses to the client.**
- **`ErrorKind`** (`~/lib/errors`, client-safe) — the one identification axis:
  `unauthorized | forbidden | not_found | validation | conflict | rate_limited |
  upstream | internal`. Drives the HTTP status, the default copy, and any
  per-kind handling. Call sites branch on the **kind**, not on a provider's codes.

## Throwing (service layer)

Wrap the provider error so its codes map to a kind and its detail survives:

```ts
const { data, error } = await supabase.from("x").select();
if (error) throw fromSupabase(error, { context: { id } });   // PGRST116→not_found, 23505→conflict, …

try { await stripe.checkout.sessions.create(...) }
catch (e) { throw fromStripe(e, { context: { teamId } }) }    // card/invalid→validation, auth→internal, …
```

Hand-thrown cases use the subclasses: `throw new NotFoundException()`,
`new ForbiddenException()`, `new ValidationException("Name is required")`, and
`instanceof NotFoundException` to identify them server-side. An `AppException`
passed back through `fromSupabase`/`fromStripe`/`AppException.from` is returned
unchanged, so wrapping is idempotent.

## Surfacing (route layer)

Catch, then convert to the namespace's surface (each helper LOGS once via
`logError` and only lets the **public** message cross the wire):

| Namespace | Helper | Result |
| --- | --- | --- |
| `api.*` (fetcher) | `toActionError(error, ctx)` | `ActionError` → `useActionErrorToast` |
| `redirect.*` / `callback.*` | `redirectBackWithAppException(request, error, { returnTo, ctx })` | 302 + flash toast |
| loaders / pages | `throw toErrorResponse(error, ctx)` | root `ErrorBoundary` (via `Response`) |
| any | `logError(error, ctx)` | normalize + structured log; returns the `AppException` |

`ActionError` now carries an optional `code` (the kind), so a client CAN branch;
`error` alone still suffices for a plain toast.

## Decisions worth a look

- **i18n:** the framework's default `publicMessage`s are **English constants**,
  not i18n keys. Routes that localize their toast copy (e.g. project settings)
  keep their own `t("…")` message and call `logError(error, ctx)` for the
  normalization + structured log — they own the user-facing string.
  `toActionError`/`toErrorResponse` (framework English defaults) are for surfaces
  where localized copy isn't set up. Localizing the defaults is a follow-up.
- **Thrown `Response` compatibility:** guards + some ops throw `Response`;
  `AppException.from` recovers a kind from a `Response`'s status, so the converters
  handle both shapes.
- **PostHog:** `logError` best-effort captures to PostHog **only when a `userId`
  is in context** (avoids ghost/merged persons) and never throws. Broader
  anonymous exception telemetry is a follow-up.
- **Server-only:** all of this except `~/lib/errors` (the kind vocabulary) is
  `.server` — `cause`/`context` carry internals that must never reach the bundle.

## Migration status

Wired: `guards`, ALL Supabase entity adapters (`*.supabase.ts`), the file-storage
Supabase adapter, `stripe/billing`, and two representative route catches (the
checkout `redirect.*` and the project-settings action). Remaining route catches
follow the identical `logError` / `toActionError` / `redirectBackWithAppException`
pattern and can be migrated incrementally.

import { layout, type RouteConfig } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

// Each top-level directory under app/routes is an ACCESS-CONTROL group with its
// own flat-routes namespace. A group's auth gate is its `route.ts` (+
// `route.middleware.ts`) at the group root: it's applied via `layout()` and
// excluded from the scan so it isn't also registered as a leaf. Presentation
// layers (`_project`, `_team`, future `_chromeless`) are pathless layouts INSIDE
// a group — one per context a page operates in. Flat (dotted) naming still applies within each group — directories are
// for access grouping, not route nesting.

// Dev-only group (showcase). Registered only outside production, so its modules
// (and everything they import) stay out of the production bundle entirely.
const devRoutes =
  process.env.NODE_ENV === "production"
    ? []
    : await flatRoutes({ rootDirectory: "routes/dev" });

export default [
  // Authenticated. Gate = protected/route.ts (middleware-only); UI pages live
  // under the _project or _team shell, data/action routes at the group root.
  layout(
    "routes/protected/route.ts",
    await flatRoutes({
      rootDirectory: "routes/protected",
      // Skip the group barrel + its middleware at the SCAN ROOT only (both glob
      // bases covered; nested `*/route.ts` are untouched).
      ignoredRouteFiles: ["route.*", "routes/protected/route.*"],
    }),
  ),
  // Unauthenticated-only (redirects to / if signed in). Gate = guest/route.ts.
  layout(
    "routes/guest/route.ts",
    await flatRoutes({
      rootDirectory: "routes/guest",
      ignoredRouteFiles: ["route.*", "routes/guest/route.*"],
    }),
  ),
  // Public. No gate, so no wrapping layout.
  ...(await flatRoutes({ rootDirectory: "routes/public" })),
  ...devRoutes,
] satisfies RouteConfig;

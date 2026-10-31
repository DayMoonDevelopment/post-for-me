import { type RouteConfig, index, route } from "@react-router/dev/routes";

// A branded Post for Me experience: "/" is the marketing home; "/docs" is the
// component showcase + shadcn style configurator (the configurator is scoped to
// docs only). Shared PFM chrome (SiteHeader) wraps both.
export default [
  // Resource routes (loaders only).
  route("resources/preset", "showcase/preset-resource.ts"),
  // The published registry channel: serves /r/<base>-<style>/<name>.json that
  // `shadcn add` fetches.
  route("r/:variant/:name", "registry-serve/route.ts"),
  route("robots.txt", "marketing/robots/route.ts"),
  route("sitemap.xml", "marketing/sitemap/route.ts"),

  // Marketing home — the branded landing (PFM-themed, SEO).
  index("marketing/_index/route.ts"),

  // Docs — the component showcase + live style configurator.
  route("docs", "showcase/route.ts", [
    index("showcase/_index/route.ts"),
    route(":component", "showcase/$component/route.ts"),
  ]),
] satisfies RouteConfig;

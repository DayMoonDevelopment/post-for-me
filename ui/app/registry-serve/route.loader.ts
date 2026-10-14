import { captureInstall } from "~/lib/posthog.server";

import type { Route } from "./+types/route";

// Every built registry item, bundled into the server build at build time via
// Vite glob — no runtime filesystem access, and it ships inside build/server
// without re-running the registry build (which needs bun, unavailable in the
// Docker image). registry-dist must exist at build time (run `bun run
// registry:build`); it's committed as the distributed artifact.
const modules = import.meta.glob("../../registry-dist/**/*.json", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

// Key by "<variant>/<name>.json" (e.g. "base-mira/status-indicator.json").
const items = new Map<string, string>();
for (const [absPath, content] of Object.entries(modules)) {
  const rel = absPath.split("registry-dist/")[1];
  if (rel) items.set(rel, content);
}

// Serves /r/<variant>/<name>.json — what `shadcn add @post-for-me/<name>`
// fetches. Dynamic (rather than a static file) so each install can be counted.
export async function loader({ params }: Route.LoaderArgs) {
  const key = `${params.variant}/${params.name}`;
  const content = items.get(key);
  if (!content) {
    throw new Response("Not found", { status: 404 });
  }

  // Count the install. Awaited so the event flushes before a serverless
  // function freezes; captureInstall is a no-op (and instant) when analytics is
  // off, and swallows its own errors so it never affects the response.
  const variant = params.variant ?? "";
  const [base, style] = variant.split("-");
  await captureInstall({
    component: (params.name ?? "").replace(/\.json$/, ""),
    variant,
    base,
    style,
  });

  return new Response(content, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Short cache: absorbs bursts, but short enough to keep counts meaningful
      // if a CDN ever sits in front of the origin.
      "Cache-Control": "public, max-age=300",
    },
  });
}

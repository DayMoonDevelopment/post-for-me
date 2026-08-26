import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.PORT) || 7361;

  return {
    server: {
      port,
      // Vite rejects requests whose Host header it does not recognise.
      // `*.localhost` is exempt by default; the Caddy dev hostnames are not,
      // so without this every request through the proxy returns
      // "Blocked request. This host is not allowed." A leading dot matches
      // the domain and all of its subdomains.
      allowedHosts: [".postforme.foo"],
    },
    plugins: [tailwindcss(), reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
    ssr: {
      // `prismjs/components/*` are stand-alone grammar files that attach to a
      // global `Prism` — `app/ui/code-block-prism.ts` sets it, and
      // `code-block-languages.ts` imports that first so the assignment lands
      // before the grammars load. That ordering only survives if the grammars
      // are BUNDLED. Left external, Rollup hoists their `import` to the top of
      // the server chunk, so they evaluate before any of the chunk's own body
      // and the built server dies at boot with "Prism is not defined" (dev is
      // unaffected: Vite's SSR loader executes modules in source order).
      noExternal: ["prismjs"],
    },
    // Pre-bundle the deps Vite would otherwise discover mid-session, so the dev
    // server doesn't stall on dep optimization and SSR resolves them cleanly
    // (mirrors the marketing app). The failure this prevents: visiting a route
    // that imports a not-yet-optimized dep triggers a re-optimization, which
    // strands the open tab with a duplicate React copy — the page throws inside
    // a provider (`TooltipProvider`, `DndContext`…) and has to be reloaded.
    //
    // Base UI is the biggest offender because every primitive is its OWN
    // subpath: each unvisited component is a fresh discovery. They're listed
    // individually because `@base-ui/react` has no barrel to pre-bundle.
    optimizeDeps: {
      include: [
        "motion",
        "@dnd-kit/core",
        "@dnd-kit/sortable",
        "@dnd-kit/utilities",
        "@base-ui/react/accordion",
        "@base-ui/react/avatar",
        "@base-ui/react/button",
        "@base-ui/react/checkbox",
        "@base-ui/react/dialog",
        "@base-ui/react/input",
        "@base-ui/react/menu",
        "@base-ui/react/merge-props",
        "@base-ui/react/popover",
        "@base-ui/react/preview-card",
        "@base-ui/react/radio",
        "@base-ui/react/radio-group",
        "@base-ui/react/scroll-area",
        "@base-ui/react/select",
        "@base-ui/react/separator",
        "@base-ui/react/switch",
        "@base-ui/react/tabs",
        "@base-ui/react/toggle",
        "@base-ui/react/toggle-group",
        "@base-ui/react/tooltip",
        "@base-ui/react/use-render",
        // Same story: single-component deps pulled in by one route each.
        "cmdk",
        "embla-carousel-react",
        "input-otp",
        "react-day-picker",
        "sonner",
      ],
    },
  };
});

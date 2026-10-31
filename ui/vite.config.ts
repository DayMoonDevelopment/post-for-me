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
    // Pre-bundle every runtime dep up front so Vite never re-optimizes mid-session.
    // A mid-session re-optimization invalidates the client module graph and leaves
    // already-open browser tabs with a dead bundle (page renders but won't hydrate
    // — controls do nothing until a hard reload). Listing them here avoids that.
    optimizeDeps: {
      include: [
        "motion",
        "@dnd-kit/core",
        "@dnd-kit/sortable",
        "@dnd-kit/utilities",
        "react",
        "react-dom",
        "react-dom/client",
        "clsx",
        "tailwind-merge",
        "class-variance-authority",
        // Icon libraries are dynamically imported on demand by IconPlaceholder;
        // pre-bundling them keeps a mid-session library switch from triggering a
        // re-optimization that would strand already-open tabs.
        "lucide-react",
        "@tabler/icons-react",
        "@phosphor-icons/react",
        "@hugeicons/react",
        "@hugeicons/core-free-icons",
        "@remixicon/react",
        "@base-ui/react/toggle",
        "@base-ui/react/toggle-group",
        "@base-ui/react/select",
        "@base-ui/react/tooltip",
      ],
    },
  };
});

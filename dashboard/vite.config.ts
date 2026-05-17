import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

function parseAllowedHosts(raw: string | undefined): string[] | true | undefined {
  if (!raw) return undefined;

  const normalized = raw.trim();
  if (!normalized) return undefined;

  if (normalized === "true" || normalized === "all" || normalized === "*") return true;

  const hosts = normalized
    .split(/[\s,]+/g)
    .map((h) => h.trim())
    .filter(Boolean);

  return hosts.length ? hosts : undefined;
}

export default defineConfig(({ mode }) => {
  // Load .env* files and allow non-VITE_ vars for config-time usage.
  const env = loadEnv(mode, process.cwd(), "");
  const allowedHosts = parseAllowedHosts(env.ALLOWED_HOST ?? process.env.ALLOWED_HOST);

  return {
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
    ssr: {
      // next-themes must be bundled, not externalized: on Vercel the deployed
      // function has both /var/task/node_modules and /var/task/dashboard/node_modules,
      // so an externalized next-themes resolves React from the root tree while
      // react-dom uses dashboard's local tree — two React instances, useContext
      // returns null, SSR throws. Bundling pins it to the same React the SSR
      // entry imports.
      noExternal: ["posthog-js", "posthog-js/react", "next-themes"],
    },
    server: {
      ...(allowedHosts ? { allowedHosts } : {}),
    },
    preview: {
      ...(allowedHosts ? { allowedHosts } : {}),
    },
  };
});

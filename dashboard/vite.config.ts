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
      noExternal: ["posthog-js", "posthog-js/react"],
    },
    server: {
      ...(allowedHosts ? { allowedHosts } : {}),
    },
    preview: {
      ...(allowedHosts ? { allowedHosts } : {}),
    },
  };
});

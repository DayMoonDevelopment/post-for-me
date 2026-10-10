import type { Config } from "@react-router/dev/config";

export default {
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  // The v7 future flags this project adopted (middleware, split route modules,
  // pass-through requests, trailing-slash-aware data requests, Vite env API) are
  // all default behavior in v8 — no flags needed.
} satisfies Config;

/// <reference types="vite/client" />

// Optional analytics config (see .env.example). Declared so Vite can inline the
// values at build time — when unset, the PostHog snippet is dead-code-eliminated
// from the client bundle entirely.
interface ImportMetaEnv {
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

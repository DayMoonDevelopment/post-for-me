import perfectionist from "eslint-plugin-perfectionist";
import react from "eslint-plugin-react";
import tseslint from "typescript-eslint";

/**
 * Intentionally minimal: this config enforces a single project rule rather
 * than a full recommended preset, so `bun run lint` reports only what we've
 * deliberately opted into.
 *
 * `react/jsx-no-leaked-render` with `validStrategies: ["ternary"]` forbids
 * `cond && <JSX/>` for conditional rendering (which can leak `0`/`NaN` into the
 * output) and requires the explicit `cond ? <JSX/> : null` form.
 */
export default tseslint.config(
  { ignores: ["build/", ".react-router/", "node_modules/", ".vendor/"] },
  {
    files: ["app/**/*.{ts,tsx}", "e2e/**/*.{ts,tsx}", "playwright.config.ts"],
    plugins: { react },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    // Pinned (not "detect") — eslint-plugin-react's version detection uses an
    // API removed in ESLint 10 and throws. Keep in sync with the react dep.
    settings: { react: { version: "19.2" } },
    rules: {
      "react/jsx-no-leaked-render": ["error", { validStrategies: ["ternary"] }],
    },
  },
  {
    // Icon boundary — STRICT BY DEFAULT. Central Icons may be imported ONLY
    // inside the branded `app/icons` layer (exempted below). Anywhere else under
    // `app/` it's a hard error; opt back in per-site, with a reason, via:
    //   // eslint-disable-next-line no-restricted-imports -- <justification>
    // Legit opt-outs today: `app/ui` shadcn primitives (structural glyphs that
    // `shadcn add` regenerates) and `app/showcase` demos (render raw glyphs).
    // `reportUnusedDisableDirectives` makes a stale opt-out itself an error, so
    // the escape hatches can't rot.
    files: ["app/**/*.{ts,tsx}"],
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@central-icons/*"],
              message:
                "Central Icons may only be imported inside app/icons. Use the semantic layer (import from ~/icons) — or, if this is a justified exception, opt out at this line with `// eslint-disable-next-line no-restricted-imports -- <why>`.",
            },
          ],
        },
      ],
    },
  },
  {
    // The branded icon layer itself — the one place Central Icons live.
    files: ["app/icons/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    // Deterministic ordering — imports, exports, and type/interface members are
    // sorted alphabetically and AUTO-FIXABLE (`bun run lint:fix`). Set to ERROR
    // so CI blocks un-ordered code; it's about uniform, mergeable diffs as more
    // devs + agents touch the repo, not the specific order. AST-only (no type
    // info, no module resolution) so the autofix stays fast. Generated
    // `supabase.types.ts` is excluded — a `gen types` run would churn it.
    // NOT enabled: `sort-objects` (reordering runtime object literals can change
    // behavior via spreads/ordered config — too risky to blanket auto-fix).
    files: ["app/**/*.{ts,tsx}", "e2e/**/*.{ts,tsx}", "playwright.config.ts"],
    ignores: ["app/lib/.server/supabase.types.ts"],
    plugins: { perfectionist },
    rules: {
      "perfectionist/sort-imports": [
        "error",
        { type: "alphabetical", order: "asc", internalPattern: ["^~/.*"] },
      ],
      "perfectionist/sort-named-imports": [
        "error",
        { type: "alphabetical", order: "asc" },
      ],
      "perfectionist/sort-exports": [
        "error",
        { type: "alphabetical", order: "asc" },
      ],
      "perfectionist/sort-named-exports": [
        "error",
        { type: "alphabetical", order: "asc" },
      ],
      "perfectionist/sort-interfaces": [
        "error",
        { type: "alphabetical", order: "asc" },
      ],
      "perfectionist/sort-object-types": [
        "error",
        { type: "alphabetical", order: "asc" },
      ],
    },
  },
);

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
  { ignores: ["build/", ".react-router/", "node_modules/"] },
  {
    files: ["app/**/*.{ts,tsx}"],
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
);

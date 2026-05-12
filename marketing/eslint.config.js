import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginImport from "eslint-plugin-import";
import preferAliasImports from "./eslint-rules/prefer-alias-imports.js";
import importOrder from "./eslint-rules/import-order.js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      ".react-router/**",
      "tailwind.config.ts",
      "routes/+types/*",
      "scripts/**",
      "eslint-rules/**",
    ],
  },
  { files: ["**/*.{js,jsx,ts,tsx}"] },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    plugins: {
      import: pluginImport,
      custom: {
        rules: {
          "prefer-alias-imports": preferAliasImports,
          "import-order": importOrder,
        },
      },
    },
    settings: {
      react: { version: "detect" },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
        node: true,
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/jsx-no-leaked-render": ["error", { validStrategies: ["ternary"] }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          disallowTypeAnnotations: false,
          fixStyle: "separate-type-imports",
        },
      ],
      "import/no-useless-path-segments": [
        "error",
        {
          noUselessIndex: true,
        },
      ],
      // Custom rule: Enforce alias imports over relative parent imports
      // Auto-fixable: bun run lint:fix
      // Prefer: import { Button } from "~/ui/button"
      // Over: import { Button } from "../../../ui/button"
      // Allows: import { Component } from "./sibling-file"
      "custom/prefer-alias-imports": "error",
    },
  },
  // Import ordering rule - applies only to app directory
  {
    files: ["app/**/*.{js,jsx,ts,tsx}"],
    rules: {
      // Custom rule: Enforce strict import ordering
      // Auto-fixable: bun run lint:fix
      // Order: 1) External modules, 2) Alias imports by parent dir, 3) Relative, 4) Types
      "custom/import-order": "error",
    },
  },
];

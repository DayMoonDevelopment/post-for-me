import "i18next";

import type common from "./locales/en/common.json";

/**
 * Type augmentation that makes `t()` key-safe.
 *
 * Without this, i18next accepts any string: `t("playground.pageTitl")` and
 * `t("this.key.does.not.exist")` both compile and both render the raw key path
 * to the user. With ~1,900 call sites across the app that's a lot of surface
 * for a silent typo. Declaring `resources` here lets TypeScript infer the key
 * union from the bundle itself, so a bad key is a build failure.
 *
 * `en` is the source of truth for the shape — every other locale is a
 * translation OF it, so their key sets must match rather than extend it. Point
 * this at `en` only; adding a second locale changes no types.
 *
 * NOTE ON WHAT THIS DOES AND DOESN'T CATCH: keys are checked; interpolation
 * variables are not. i18next can only infer `{{name}}` from resources declared
 * as `as const` TS or `.d.ts` — JSON imports widen to `string`. So
 * `t("playground.removeAccount")` with no `{{name}}` still compiles. Catching
 * that would mean giving up JSON (and the tooling that reads it), which isn't
 * worth it — the render shows `{{name}}` verbatim, which is obvious on sight.
 */
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof common;
    };
    /**
     * Keep string keys — `t("a.b.c")` — rather than i18next v26's selector API
     * (`t($ => $.a.b.c)`).
     *
     * Setting `enableSelector` (including `"optimize"`) makes selectors the ONLY
     * accepted form: every one of our ~1,900 string call sites stops compiling.
     * The selector API's payoff is lazy key resolution for very large bundles;
     * at ~700 keys the eager union costs us about a second of `tsc`, which is
     * not worth a codemod of the entire app. Revisit if the bundle grows an
     * order of magnitude or the language server starts to drag.
     */
  }
}

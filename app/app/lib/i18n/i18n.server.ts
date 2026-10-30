import type { Namespace } from "i18next";

import { type TFunction } from "i18next";

import { defaultNS } from "./config";
import { createI18nInstance } from "./i18n";
import { detectLocale } from "./locale.server";

/**
 * Resolve a request's locale and return a bound `t` for use in loaders and
 * actions (e.g. server-side validation messages, or localized `meta` titles
 * fed through loader data). Mirrors remix-i18next's `getFixedT`.
 *
 * Components don't need this — they read `t` from context via `useTranslation`
 * (the provider lives in the root `Layout`). This is for code that runs outside
 * the React tree, where there's no context to read.
 */
export async function getServerT(
  request: Request,
  ns: Namespace = defaultNS,
): Promise<TFunction> {
  const lng = await detectLocale(request);
  return createI18nInstance(lng).getFixedT(lng, ns);
}

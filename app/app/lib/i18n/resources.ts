/**
 * Bundled translation resources.
 *
 * Importing the JSON here (rather than fetching it over HTTP at runtime) means
 * every translation is in the JS bundle and available synchronously on both
 * sides. That's the deliberate trade we made for instant rendering: no
 * loading flash, no extra round-trip, at the cost of re-deploying to change
 * strings. To add a namespace, add the JSON file and a key on each locale.
 */
import enCommon from "./locales/en/common.json";

export const resources = {
  en: { common: enCommon },
} as const;

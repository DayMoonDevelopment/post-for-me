import {
  DEFAULT_CFG,
  type PresetCssVars,
  type PresetFont,
} from "./presets";
import { buildParamsUrl, resolvePreset } from "./resolve-preset.server";

type DefaultPreset = {
  name: string | null;
  cssVars: PresetCssVars;
  fonts: PresetFont[];
};

// Resolve the default theme server-side so the first paint is already themed —
// no post-hydration round-trip to /resources/preset, no flash of unthemed UI.
// User-driven axis changes still go through the fetcher in the component.
export async function loader(): Promise<DefaultPreset> {
  const result = await resolvePreset(buildParamsUrl(DEFAULT_CFG));
  if ("error" in result) {
    return { name: null, cssVars: {}, fonts: [] };
  }
  return { name: result.name, cssVars: result.cssVars, fonts: result.fonts };
}

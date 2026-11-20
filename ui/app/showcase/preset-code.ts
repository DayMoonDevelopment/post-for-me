// Preset code encode/decode — VENDORED VERBATIM from shadcn's `shadcn/preset`
// (packages/shadcn/src/preset/preset.ts in shadcn-ui/ui). It bit-packs the design
// system params into one integer and base62-encodes it with a version prefix, so
// `encodePreset(config)` produces the SAME `--preset <code>` shadcn's /create mints
// (verified: b2h47HD7kv round-trips). Browser-safe, no deps.
//
// Vendored (not imported from the CLI package) to keep it out of the client bundle
// and stable. It is INDEX-BASED on these exact value arrays, so keep them in sync
// with shadcn following ITS backward-compat rules:
//   1. Never reorder existing value arrays — only append.
//   2. New fields must default to index 0.
//   3. Only append new fields to the end of PRESET_FIELDS.
//   4. Stay under 53 bits total (JS safe-integer limit).
//
// NOTE: these are shadcn's canonical arrays (order matters for the code). They are
// deliberately distinct from the panel's own AXES in ./presets (which curate the
// offered options + order); every AXES value is a valid member of these arrays.

export const PRESET_STYLES = [
  "nova", "vega", "maia", "lyra", "mira", "luma", "sera", "rhea",
] as const;

export const PRESET_BASE_COLORS = [
  "neutral", "stone", "zinc", "gray", "mauve", "olive", "mist", "taupe",
] as const;

export const PRESET_THEMES = [
  "neutral", "stone", "zinc", "gray", "amber", "blue", "cyan", "emerald",
  "fuchsia", "green", "indigo", "lime", "orange", "pink", "purple", "red",
  "rose", "sky", "teal", "violet", "yellow", "mauve", "olive", "mist", "taupe",
] as const;

export const PRESET_CHART_COLORS = PRESET_THEMES;

export const PRESET_ICON_LIBRARIES = [
  "lucide", "hugeicons", "tabler", "phosphor", "remixicon",
] as const;

export const PRESET_FONTS = [
  "inter", "noto-sans", "nunito-sans", "figtree", "roboto", "raleway",
  "dm-sans", "public-sans", "outfit", "jetbrains-mono", "geist", "geist-mono",
  "lora", "merriweather", "playfair-display", "noto-serif", "roboto-slab",
  "oxanium", "manrope", "space-grotesk", "montserrat", "ibm-plex-sans",
  "source-sans-3", "instrument-sans", "eb-garamond", "instrument-serif",
] as const;

export const PRESET_FONT_HEADINGS = ["inherit", ...PRESET_FONTS] as const;

export const PRESET_RADII = [
  "default", "none", "small", "medium", "large",
] as const;

export const PRESET_MENU_ACCENTS = ["subtle", "bold"] as const;
export const PRESET_MENU_COLORS = [
  "default", "inverted", "default-translucent", "inverted-translucent",
] as const;

// V1 fields (version "a"): 40 bits. No chartColor.
const PRESET_FIELDS_V1 = [
  { key: "menuColor", values: PRESET_MENU_COLORS, bits: 3 },
  { key: "menuAccent", values: PRESET_MENU_ACCENTS, bits: 3 },
  { key: "radius", values: PRESET_RADII, bits: 4 },
  { key: "font", values: PRESET_FONTS, bits: 6 },
  { key: "iconLibrary", values: PRESET_ICON_LIBRARIES, bits: 6 },
  { key: "theme", values: PRESET_THEMES, bits: 6 },
  { key: "baseColor", values: PRESET_BASE_COLORS, bits: 6 },
  { key: "style", values: PRESET_STYLES, bits: 6 },
] as const;

// V2 fields (version "b"): 51 bits. Adds chartColor and fontHeading.
const PRESET_FIELDS_V2 = [
  ...PRESET_FIELDS_V1,
  { key: "chartColor", values: PRESET_CHART_COLORS, bits: 6 },
  { key: "fontHeading", values: PRESET_FONT_HEADINGS, bits: 5 },
] as const;

export type PresetConfig = {
  style: string;
  baseColor: string;
  theme: string;
  chartColor?: string;
  iconLibrary: string;
  font: string;
  fontHeading: string;
  radius: string;
  menuAccent: string;
  menuColor: string;
};

export const DEFAULT_PRESET_CONFIG = Object.fromEntries(
  PRESET_FIELDS_V2.map((f) => [f.key, f.values[0]]),
) as PresetConfig;

const BASE62 =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const CURRENT_VERSION = "b";
const VALID_VERSIONS = ["a", "b"] as const;

export function toBase62(num: number): string {
  if (num === 0) return "0";
  let result = "";
  let n = num;
  while (n > 0) {
    result = BASE62[n % 62] + result;
    n = Math.floor(n / 62);
  }
  return result;
}

export function fromBase62(str: string): number {
  let result = 0;
  for (let i = 0; i < str.length; i++) {
    const idx = BASE62.indexOf(str[i]!);
    if (idx === -1) return -1;
    result = result * 62 + idx;
  }
  return result;
}

/** Encode a config into shadcn's short `--preset` code. Always v2 ("b"). */
export function encodePreset(config: Partial<PresetConfig>): string {
  const merged = { ...DEFAULT_PRESET_CONFIG, ...config } as Record<
    string,
    string
  >;
  // Multiplication (not bitwise — JS bitwise truncates to 32 bits).
  let bits = 0;
  let offset = 0;
  for (const field of PRESET_FIELDS_V2) {
    const idx = (field.values as readonly string[]).indexOf(merged[field.key]!);
    bits += (idx === -1 ? 0 : idx) * 2 ** offset;
    offset += field.bits;
  }
  return CURRENT_VERSION + toBase62(bits);
}

/** Decode a `--preset` code back into a config, or null if invalid. */
export function decodePreset(code: string): PresetConfig | null {
  if (!code || code.length < 2) return null;
  const version = code[0]!;
  if (!VALID_VERSIONS.includes(version as (typeof VALID_VERSIONS)[number])) {
    return null;
  }
  const fields = version === "a" ? PRESET_FIELDS_V1 : PRESET_FIELDS_V2;
  const bits = fromBase62(code.slice(1));
  if (bits < 0) return null;

  const result = {} as Record<string, string>;
  let offset = 0;
  for (const field of fields) {
    const idx = Math.floor(bits / 2 ** offset) % 2 ** field.bits;
    result[field.key] =
      idx < field.values.length ? field.values[idx]! : field.values[0]!;
    offset += field.bits;
  }
  if (version === "a") result.fontHeading = "inherit";
  return result as PresetConfig;
}

/** Does a string look like a preset code (version char + base62, ≤10)? */
export function isPresetCode(value: string): boolean {
  if (!value || value.length < 2 || value.length > 10) return false;
  if (!VALID_VERSIONS.includes(value[0] as (typeof VALID_VERSIONS)[number])) {
    return false;
  }
  for (let i = 1; i < value.length; i++) {
    if (BASE62.indexOf(value[i]!) === -1) return false;
  }
  return true;
}

/**
 * Pull a preset code out of anything a user might paste — a bare code,
 * `--preset <code>`, or a `…/create?preset=<code>` URL.
 */
export function extractPresetCode(input: string): string {
  let value = input.trim().replace(/^["']|["']$/g, "");
  value = value.replace(/^(--preset|-p)[=\s]+/i, "").trim();
  const match = value.match(/[?&]preset=([^&\s]+)/);
  return (match ? match[1]! : value).trim();
}

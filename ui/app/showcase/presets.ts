// Single source of truth for the shadcn /create axes — shared by the control
// panel (route.component) and the server-side preset resolver
// (resolve-preset.server). Each value pool is verified against the live
// ui.shadcn.com/init endpoint. Keep this a pure-data module (no server-only
// imports) so the client bundle can import it too.

export const AXES = {
  base: ["base", "radix"],
  style: ["vega", "nova", "maia", "lyra", "mira", "luma", "sera", "rhea"],
  baseColor: ["neutral", "stone", "zinc", "mauve", "olive", "mist", "taupe"],
  theme: [
    "blue", "green", "violet", "orange", "red", "amber",
    "teal", "indigo", "cyan", "rose", "yellow",
  ],
  radius: ["none", "small", "medium", "default", "large"],
  iconLibrary: ["lucide", "tabler", "hugeicons", "phosphor", "remixicon"],
  // The full /create font catalog (sans, serif, and mono families).
  font: [
    "geist", "inter", "noto-sans", "nunito-sans", "figtree", "roboto",
    "raleway", "dm-sans", "public-sans", "outfit", "oxanium", "manrope",
    "space-grotesk", "montserrat", "ibm-plex-sans", "source-sans-3",
    "instrument-sans", "geist-mono", "jetbrains-mono", "noto-serif",
    "roboto-slab", "merriweather", "lora", "playfair-display", "eb-garamond",
  ],
} as const;

// The styles the preview can render — those with per-style primitives fetched into
// app/showcase/primitives/<style>/ (see scripts/fetch-shadcn-primitives.ts). Same
// set as AXES.style; kept as its own name because the Style control means
// "renderable styles". Extend alongside the fetch script's STYLES list.
export const SHIPPED_STYLES = AXES.style;

export const FONT_HEADING_OPTIONS = ["inherit", ...AXES.font] as const;

// Menu axes shadcn's /init accepts; we keep these constant.
export const MENU_COLOR = "default-translucent";
export const MENU_ACCENT = ["subtle", "bold"] as const;

// A resolved preset's token maps and derived webfonts (shared by the server
// resolver and the client component so the loader's data type stays concrete).
export type PresetCssVars = {
  theme?: Record<string, string>;
  light?: Record<string, string>;
  dark?: Record<string, string>;
};

export type PresetFont = { slug: string; family: string; stylesheet: string };

export type Cfg = {
  base: string;
  style: string;
  baseColor: string;
  theme: string;
  chartColor: string;
  radius: string;
  font: string;
  fontHeading: string;
  iconLibrary: string;
  // Not exposed as controls, but part of the shadcn preset code — carried so a
  // pasted preset round-trips to the exact same code.
  menuColor: string;
  menuAccent: string;
};

export const DEFAULT_CFG: Cfg = {
  base: "base",
  style: "mira",
  baseColor: "zinc",
  // Theme and chart default to the base color — a monochrome primary derived
  // from the neutral, matching the app's own theme. Accents are opt-in.
  theme: "zinc",
  chartColor: "zinc",
  radius: "default",
  font: "geist",
  fontHeading: "inherit",
  iconLibrary: "lucide",
  menuColor: MENU_COLOR,
  menuAccent: MENU_ACCENT[0],
};

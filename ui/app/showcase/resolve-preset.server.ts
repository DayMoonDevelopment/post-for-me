import {
  AXES,
  MENU_ACCENT,
  MENU_COLOR,
  type PresetCssVars,
  type PresetFont,
} from "./presets";

// shadcn's preset codes are opaque — only shadcn can resolve them. The official
// /init endpoint returns the resolved theme (a registry:style object) as JSON,
// including `cssVars` { theme, light, dark } and `registryDependencies`. We
// fetch it server-side so the browser never hits CORS and we never decode the
// code ourselves. Shared by the /resources/preset resource route and the
// showcase layout loader (which resolves the default theme for SSR).

const ENDPOINT = "https://ui.shadcn.com/init";

export type ResolvedPreset = {
  name: string;
  cssVars: PresetCssVars;
  fonts: PresetFont[];
};

// Slug → family where naive title-casing is wrong (acronyms / mixed case).
const FONT_FAMILY_OVERRIDES: Record<string, string> = {
  "ibm-plex-sans": "IBM Plex Sans",
  "ibm-plex-mono": "IBM Plex Mono",
  "ibm-plex-serif": "IBM Plex Serif",
  "dm-sans": "DM Sans",
  "dm-mono": "DM Mono",
  "dm-serif-display": "DM Serif Display",
  "eb-garamond": "EB Garamond",
  "jetbrains-mono": "JetBrains Mono",
};

function fontFamily(slug: string): string {
  return (
    FONT_FAMILY_OVERRIDES[slug] ??
    slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

// Google Fonts covers the shadcn font catalog (IBM Plex, Inter, Geist, …).
function fontStylesheet(family: string): string {
  const param = family.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${param}:wght@400;500;600;700&display=swap`;
}

// Accept any form a user might paste:
//   - bare code:           b1ty7oeaA
//   - CLI flag:            --preset b1ty7oeaA  (or -p, or --preset=b1ty7oeaA)
//   - /create URL:         https://ui.shadcn.com/create?preset=b1ty7oeaA
export function extractCode(input: string): string {
  let value = input.trim().replace(/^["']|["']$/g, "");
  value = value.replace(/^(--preset|-p)[=\s]+/i, "").trim();
  const match = value.match(/[?&]preset=([^&\s]+)/);
  return (match ? match[1] : value).trim();
}

function pick<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

// A random-but-valid preset for Shuffle — the same axes shadcn's own /create
// "Shuffle" randomizes.
export function shuffleUrl(): string {
  const theme = pick(AXES.theme);
  const params = new URLSearchParams({
    base: pick(AXES.base),
    style: pick(AXES.style),
    baseColor: pick(AXES.baseColor),
    theme,
    chartColor: theme,
    radius: pick(AXES.radius),
    font: pick(AXES.font),
    fontHeading: "inherit",
    iconLibrary: pick(AXES.iconLibrary),
    menuColor: MENU_COLOR,
    menuAccent: pick(MENU_ACCENT),
  });
  return `${ENDPOINT}?${params.toString()}`;
}

export function presetCode(code: string): string {
  return `${ENDPOINT}?preset=${encodeURIComponent(extractCode(code))}`;
}

// Build an /init URL from explicit axis params (the control-panel path), filling
// any omitted axis with a sensible default.
export function buildParamsUrl(p: Partial<Record<keyof typeof AXES | "chartColor" | "fontHeading" | "menuColor" | "menuAccent", string>>): string {
  const theme = p.theme ?? "blue";
  const params = new URLSearchParams({
    base: p.base ?? "radix",
    style: p.style ?? "mira",
    baseColor: p.baseColor ?? "zinc",
    theme,
    chartColor: p.chartColor ?? theme,
    radius: p.radius ?? "default",
    font: p.font ?? "geist",
    fontHeading: p.fontHeading ?? "inherit",
    iconLibrary: p.iconLibrary ?? "lucide",
    menuColor: p.menuColor ?? MENU_COLOR,
    menuAccent: p.menuAccent ?? "subtle",
  });
  return `${ENDPOINT}?${params.toString()}`;
}

// The /init response is a pure function of its URL, so memoize resolved presets
// by upstream URL — toggling axes back and forth, Shuffle landing on a repeat,
// or the default-preset loader on every navigation all reuse the result instead
// of re-hitting shadcn. Bounded by the (small) axis-combination space.
const cache = new Map<string, ResolvedPreset>();

export type ResolveError = { error: string; status: number };

export async function resolvePreset(
  target: string,
): Promise<ResolvedPreset | ResolveError> {
  const cached = cache.get(target);
  if (cached) return cached;

  try {
    const res = await fetch(target, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      return { error: "Could not resolve preset.", status: 502 };
    }
    const data = (await res.json()) as {
      name?: string;
      cssVars?: PresetCssVars;
      registryDependencies?: string[];
    };

    // Body/heading fonts ship as `font-<slug>` registry dependencies, NOT as
    // cssVars — so we derive a loadable webfont for each to match the preview.
    const fonts = (data.registryDependencies ?? [])
      .filter((dep) => typeof dep === "string" && dep.startsWith("font-"))
      .map((dep) => {
        const slug = dep.slice("font-".length);
        const family = fontFamily(slug);
        return { slug, family, stylesheet: fontStylesheet(family) };
      });

    const resolved: ResolvedPreset = {
      name: data.name ?? "preset",
      cssVars: data.cssVars ?? {},
      fonts,
    };
    cache.set(target, resolved);
    return resolved;
  } catch {
    return { error: "Failed to reach the shadcn preset service.", status: 502 };
  }
}

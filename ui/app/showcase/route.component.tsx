import * as React from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import {
  Link,
  Outlet,
  useFetcher,
  useLoaderData,
  useParams,
} from "react-router";

import { cn } from "~/lib/utils";
import { SiteHeader } from "~/site/site-header";
import { Button } from "~/ui/button";
import {
  IconLibraryProvider,
  type IconLibraryName,
} from "~/ui/icon-placeholder";
import { Input } from "~/ui/input";
import { Label } from "~/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/select";
import { Separator } from "~/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
} from "~/ui/sidebar";

import { demoOrder, demos } from "./components/demos";
import {
  decodePreset,
  encodePreset,
  extractPresetCode,
} from "./preset-code";
import {
  AXES,
  DEFAULT_CFG,
  FONT_HEADING_OPTIONS,
  SHIPPED_STYLES,
  type Cfg,
  type PresetCssVars,
  type PresetFont,
} from "./presets";
import type { loader } from "./route.loader";
import { StyleProvider } from "./style-context";

// The shadcn Create tool — where these preset hashes come from and resolve back.
const SHADCN_CREATE_URL = "https://ui.shadcn.com/create";

type PresetResponse = {
  name?: string;
  cssVars?: PresetCssVars;
  fonts?: PresetFont[];
  error?: string;
};

function titleize(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** The subset of Cfg that shadcn's preset code encodes (base is NOT encoded). */
function toPresetConfig(cfg: Cfg) {
  return {
    style: cfg.style,
    baseColor: cfg.baseColor,
    theme: cfg.theme,
    chartColor: cfg.chartColor,
    iconLibrary: cfg.iconLibrary,
    font: cfg.font,
    fontHeading: cfg.fontHeading,
    radius: cfg.radius,
    menuColor: cfg.menuColor,
    menuAccent: cfg.menuAccent,
  };
}

// Flatten a preset's { theme, light|dark } token maps into a flat CSS custom
// property record. Emitted as a :root block (see below) it overrides the
// stylesheet defaults, so the entire app — chrome, preview, and portaled
// popups — re-skins together.
function toCssVars(
  cssVars: PresetCssVars | undefined,
  mode: "light" | "dark",
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cssVars) return out;
  const apply = (obj?: Record<string, string>) => {
    if (!obj) return;
    for (const [key, value] of Object.entries(obj)) {
      out[key.startsWith("--") ? key : `--${key}`] = value;
    }
  };
  apply(cssVars.theme);
  apply(cssVars[mode] ?? cssVars.light);
  return out;
}

const SWATCHES: Array<[label: string, token: string]> = [
  ["background", "--background"],
  ["foreground", "--foreground"],
  ["primary", "--primary"],
  ["secondary", "--secondary"],
  ["muted", "--muted"],
  ["accent", "--accent"],
  ["border", "--border"],
  ["ring", "--ring"],
  ["chart-1", "--chart-1"],
  ["chart-2", "--chart-2"],
  ["chart-3", "--chart-3"],
  ["chart-4", "--chart-4"],
];

// No props and tokens read via `var(--…)`, so it never needs to re-render — CSS
// reflects theme changes on its own.
const PresetSwatches = React.memo(function PresetSwatches() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {SWATCHES.map(([label, token]) => (
        <div key={token} className="space-y-1">
          <div
            className="h-7 w-full rounded-md border"
            style={{ backgroundColor: `var(${token})` }}
          />
          <p className="truncate text-[10px] text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
});

// Nav is grouped into labelled sections (each demo's `section`, default
// "Components"); alphabetical by title within a section, sections in a fixed order.
// A demo with a `parent` nests UNDER that parent as a sub-item (in demoOrder), so the
// parent (e.g. Social Post Preview) can stay focused and each child is its own page.
type NavNode = { name: string; children: string[] };
const NAV_SECTIONS: Array<{ label: string; items: NavNode[] }> = (() => {
  const SECTION_ORDER = ["Blocks", "Components", "Hooks", "Types"];
  const rank = (label: string) => {
    const i = SECTION_ORDER.indexOf(label);
    return i === -1 ? SECTION_ORDER.length : i;
  };
  // children keyed by parent, kept in demoOrder (so their order is authored, not alpha).
  const childrenByParent = new Map<string, string[]>();
  for (const name of demoOrder) {
    const parent = demos[name].parent;
    if (!parent) continue;
    const list = childrenByParent.get(parent);
    if (list) list.push(name);
    else childrenByParent.set(parent, [name]);
  }
  const bySection = new Map<string, string[]>();
  for (const name of demoOrder) {
    if (demos[name].parent) continue; // nested under their parent below
    const label = demos[name].section ?? "Components";
    const list = bySection.get(label);
    if (list) list.push(name);
    else bySection.set(label, [name]);
  }
  for (const items of bySection.values()) {
    items.sort((a, b) => demos[a].title.localeCompare(demos[b].title));
  }
  return [...bySection.entries()]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([label, names]) => ({
      label,
      items: names.map((name) => ({
        name,
        children: childrenByParent.get(name) ?? [],
      })),
    }));
})();

// Component nav, grouped into labelled sections. Depends only on the active
// route param, so memoize it — the configurator's churn doesn't re-render it.
const ComponentNav = React.memo(function ComponentNav({
  active,
}: {
  active?: string;
}) {
  return (
    <>
      {NAV_SECTIONS.map((section) => (
        <SidebarGroup key={section.label} className="p-0">
          <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {section.items.map(({ name, children }) => (
                <SidebarMenuItem key={name}>
                  <SidebarMenuButton
                    isActive={name === active}
                    render={<Link to={`/docs/${name}`} />}
                  >
                    {demos[name].title}
                  </SidebarMenuButton>
                  {children.length ? (
                    <SidebarMenuSub>
                      {children.map((child) => (
                        <SidebarMenuSubItem key={child}>
                          <SidebarMenuSubButton
                            isActive={child === active}
                            render={<Link to={`/docs/${child}`} />}
                          >
                            {demos[child].title}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
});

function ControlSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly string[];
}) {
  const items = options.map((option) => ({
    label: titleize(option),
    value: option,
  }));
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => onValueChange(next as string)}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

export function Component() {
  const { component } = useParams();
  // Default theme resolved server-side (loader) so the first paint is themed —
  // no post-hydration fetch. The fetcher below handles user-driven changes.
  const initial = useLoaderData<typeof loader>();
  const fetcher = useFetcher<PresetResponse>();

  const [cfg, setCfg] = React.useState<Cfg>(DEFAULT_CFG);
  const [mode, setMode] = React.useState<"light" | "dark">("light");
  const [applied, setApplied] = React.useState<PresetCssVars | null>(
    initial.cssVars ?? null,
  );
  const [fonts, setFonts] = React.useState<PresetFont[]>(initial.fonts ?? []);
  const [codeInput, setCodeInput] = React.useState("");
  const [codeError, setCodeError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  // The shadcn --preset code for the current config, generated the SAME way
  // ui.shadcn.com/create does (vendored codec) — so it matches theirs exactly.
  const presetCode = React.useMemo(
    () => encodePreset(toPresetConfig(cfg)),
    [cfg],
  );

  function resolve(next: Cfg) {
    const qs = new URLSearchParams(next as Record<string, string>);
    fetcher.load(`/resources/preset?${qs.toString()}`);
  }

  // Manual entry: resolve a pasted preset (bare hash, `--preset X`, or a
  // /create URL — the server's extractCode normalizes all three).
  function applyCode(raw: string) {
    const decoded = decodePreset(extractPresetCode(raw));
    if (!decoded) {
      setCodeError("That doesn't look like a valid preset code.");
      return;
    }
    setCodeError(null);
    const next: Cfg = {
      ...cfg, // the code carries no base — keep the current one
      style: decoded.style,
      baseColor: decoded.baseColor,
      theme: decoded.theme,
      chartColor: decoded.chartColor ?? decoded.theme,
      radius: decoded.radius,
      font: decoded.font,
      fontHeading: decoded.fontHeading,
      iconLibrary: decoded.iconLibrary,
      menuColor: decoded.menuColor,
      menuAccent: decoded.menuAccent,
    };
    setCfg(next);
    resolve(next);
  }

  function onSubmitCode(event: React.FormEvent) {
    event.preventDefault();
    applyCode(codeInput);
    setCodeInput("");
  }

  const copyHash = React.useCallback(() => {
    navigator.clipboard?.writeText(`--preset ${presetCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [presetCode]);

  const openCreate = React.useCallback(() => {
    window.open(
      `${SHADCN_CREATE_URL}?preset=${presetCode}`,
      "_blank",
      "noopener,noreferrer",
    );
  }, [presetCode]);

  // Promote a resolve into the applied theme + fonts.
  React.useEffect(() => {
    if (fetcher.data?.cssVars && Object.keys(fetcher.data.cssVars).length > 0) {
      setApplied(fetcher.data.cssVars);
      setFonts(fetcher.data.fonts ?? []);
    }
  }, [fetcher.data]);

  // Load each preset webfont once.
  React.useEffect(() => {
    for (const font of fonts) {
      if (document.querySelector(`link[data-preset-font="${font.slug}"]`))
        continue;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = font.stylesheet;
      link.dataset.presetFont = font.slug;
      document.head.appendChild(link);
    }
  }, [fonts]);

  const sansFamily = fonts[0]?.family;

  // Declarative theming: render the resolved tokens as a :root block. Seeded
  // from the loader, so it's server-rendered and the first paint is already
  // skinned. :root themes the whole app, including portaled popups.
  const themeCss = React.useMemo(() => {
    const vars = toCssVars(applied ?? undefined, mode);
    if (sansFamily) {
      vars["--font-sans"] =
        `"${sansFamily}", ui-sans-serif, system-ui, sans-serif`;
    }
    const decls = Object.entries(vars).map(([key, value]) => `${key}:${value}`);
    if (sansFamily) decls.push("font-family:var(--font-sans)");
    return decls.length ? `:root{${decls.join(";")}}` : "";
  }, [applied, mode, sansFamily]);

  // The .dark class (Tailwind dark: variants) must be a real class on <html> so
  // portaled popups inherit it too. Tokens are handled declaratively above.
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  function setAxis(key: keyof Cfg, value: string) {
    const next: Cfg = { ...cfg, [key]: value };
    // Theme tracks the base color (a monochrome primary) until an accent is
    // chosen; chart color tracks the theme the same way. Each stays put once
    // explicitly overridden — "default matches, override sticks".
    if (key === "baseColor") {
      if (cfg.theme === cfg.baseColor) next.theme = value;
      if (cfg.chartColor === cfg.theme) next.chartColor = next.theme;
    }
    if (key === "theme") {
      if (cfg.chartColor === cfg.theme) next.chartColor = value;
    }
    setCfg(next);
    resolve(next);
  }

  const colorOptions = [cfg.baseColor, ...AXES.theme];

  // Stable identity so the detail route doesn't re-render on unrelated changes
  // (mode/font) — only when base or style actually changes.
  const outletContext = React.useMemo(
    () => ({ base: cfg.base, style: cfg.style }),
    [cfg.base, cfg.style],
  );

  // The `.style-<name>` class on <main> (below) resolves our `cn-avatar-*` hooks,
  // but Base UI PORTALS (dialog/popover/dropdown/tooltip) render into
  // document.body — OUTSIDE <main> — so a portaled PlatformAvatar would lose its
  // `--ar` radius (and fill/ring) and render square. Mirror the scope onto
  // <body> so portaled previews resolve the hooks too. Client-only, which is
  // fine: portals open on interaction, after this has run. (The cn-* rules only
  // match elements that USE the hooks, so the chrome is unaffected.)
  React.useEffect(() => {
    const cls = `style-${cfg.style}`;
    document.body.classList.add(cls);
    return () => document.body.classList.remove(cls);
  }, [cfg.style]);

  return (
    <IconLibraryProvider value={cfg.iconLibrary as IconLibraryName}>
      {themeCss ? (
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      ) : null}
      <SidebarProvider className="h-svh flex-col bg-background text-foreground">
        {/* Full-width header on top */}
        <SiteHeader>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle dark mode"
            onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}
          >
            {mode === "light" ? "☀" : "☾"}
          </Button>
        </SiteHeader>

        <div className="flex min-h-0 flex-1">
          {/* Left — component nav; blends into the canvas (no panel bg or border) */}
          <div className="hidden shrink-0 p-3 md:flex">
            <Sidebar
              collapsible="none"
              variant="sidebar"
              className="bg-background! text-foreground!"
            >
              <SidebarContent className="gap-4 py-1">
                <ComponentNav active={component} />
              </SidebarContent>
            </Sidebar>
          </div>

          {/* Center — docs canvas. Only the preview re-skins to the selected style:
              the StyleProvider drives the per-style primitive dispatchers (shadcn's
              actual per-style components), and the `.style-<name>` wrapper resolves our
              avatars' `cn-avatar-*` surface hooks live. Chrome outside it stays put. */}
          <main
            className={cn(
              "min-w-0 flex-1 overflow-y-auto px-6 py-10 lg:px-12",
              `style-${cfg.style}`,
            )}
          >
            <StyleProvider value={cfg.style}>
              <Outlet context={outletContext} />
            </StyleProvider>
          </main>

          {/* Right — Shadcn Create, floating shadcn sidebar */}
          <div className="hidden shrink-0 p-2 lg:flex">
            <Sidebar
              collapsible="none"
              variant="floating"
              className="overflow-hidden rounded-xl border bg-sidebar shadow-sm"
            >
              <SidebarHeader className="border-b">
                <span className="text-sm font-semibold">Shadcn Create</span>
              </SidebarHeader>

              <SidebarContent className="gap-4 p-3">
                {/* Live-skin axes — re-skin the whole app via tokens on <html>;
                    Style swaps the cn-* wrapper class. */}
                <div className="grid gap-3">
                  <ControlSelect label="Style" value={cfg.style} onValueChange={(v) => setAxis("style", v)} options={SHIPPED_STYLES} />
                  <ControlSelect label="Base Color" value={cfg.baseColor} onValueChange={(v) => setAxis("baseColor", v)} options={AXES.baseColor} />
                  <ControlSelect label="Theme" value={cfg.theme} onValueChange={(v) => setAxis("theme", v)} options={colorOptions} />
                  <ControlSelect label="Chart Color" value={cfg.chartColor} onValueChange={(v) => setAxis("chartColor", v)} options={colorOptions} />
                  <ControlSelect label="Radius" value={cfg.radius} onValueChange={(v) => setAxis("radius", v)} options={AXES.radius} />
                  <ControlSelect label="Font" value={cfg.font} onValueChange={(v) => setAxis("font", v)} options={AXES.font} />
                  <ControlSelect label="Heading" value={cfg.fontHeading} onValueChange={(v) => setAxis("fontHeading", v)} options={FONT_HEADING_OPTIONS} />
                  <ControlSelect label="Icon Library" value={cfg.iconLibrary} onValueChange={(v) => setAxis("iconLibrary", v)} options={AXES.iconLibrary} />
                </div>

                <Separator />

                {/* Install-time axis: Base selects the primitive the consumer
                    installs. It changes the generated code, not the live app. */}
                <div className="grid gap-2">
                  <ControlSelect label="Base" value={cfg.base} onValueChange={(v) => setAxis("base", v)} options={AXES.base} />
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    Install option — changes the generated component code, not
                    this preview.
                  </p>
                </div>

                <Separator />

                <div className="grid gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Palette
                  </p>
                  <PresetSwatches />
                </div>
              </SidebarContent>

              <SidebarFooter className="gap-2 border-t">
                {/* Preset code — generated to match ui.shadcn.com/create exactly */}
                <div className="flex items-center gap-1.5">
                  <code className="min-w-0 flex-1 truncate rounded bg-muted px-1.5 py-1 font-mono text-[11px]">
                    --preset {presetCode}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Copy preset code"
                    onClick={copyHash}
                  >
                    {copied ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                </div>

                {/* Manual entry — paste a shadcn preset code */}
                <form
                  onSubmit={onSubmitCode}
                  className="flex items-center gap-1.5"
                >
                  <Input
                    value={codeInput}
                    onChange={(event) => setCodeInput(event.target.value)}
                    placeholder="Paste a preset code…"
                    aria-label="Preset code"
                    className="h-7 text-xs"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={!codeInput.trim()}
                  >
                    Apply
                  </Button>
                </form>
                {codeError ?? fetcher.data?.error ? (
                  <p className="text-[10px] text-destructive">
                    {codeError ?? fetcher.data?.error}
                  </p>
                ) : null}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={openCreate}
                >
                  Open in Shadcn Create
                  <ExternalLink className="size-3.5" />
                </Button>
              </SidebarFooter>
            </Sidebar>
          </div>
        </div>
      </SidebarProvider>
    </IconLibraryProvider>
  );
}

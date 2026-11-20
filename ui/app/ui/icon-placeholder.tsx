import * as React from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import { useHydrated } from "~/hooks/use-hydrated";

// IconPlaceholder mirrors shadcn's preset icon mechanism. A component author
// writes ONE element naming the equivalent glyph in each supported library:
//
//   <IconPlaceholder lucide="Code" tabler="IconCode" phosphor="Code"
//                    hugeicons="SourceCodeIcon" remixicon="RiCodeSSlashLine" />
//
// In a published shadcn component the CLI rewrites this into a real import for
// the consumer's chosen `iconLibrary` at `shadcn add` time (a build-time AST
// transform). Here in the showcase we resolve it at RUNTIME instead, against the
// library selected in the configurator — so the preview's own glyphs swap live.
//
// Only the active library's module is loaded (lazy dynamic import), so picking a
// library pulls just that one icon package's chunk.

export const ICON_LIBRARIES = [
  { name: "lucide", title: "Lucide" },
  { name: "tabler", title: "Tabler Icons" },
  { name: "phosphor", title: "Phosphor Icons" },
  { name: "hugeicons", title: "HugeIcons" },
  { name: "remixicon", title: "Remix Icon" },
] as const;

export type IconLibraryName = (typeof ICON_LIBRARIES)[number]["name"];

// Active-library context. Every IconPlaceholder under a provider renders glyphs
// from the same library; the configurator drives the value.
const IconLibraryContext = React.createContext<IconLibraryName>("lucide");

// Hydration is a single global fact, so the provider computes it once and shares
// it — rather than every IconPlaceholder owning its own useState/useEffect pair
// (which would be N effects firing at hydration on an icon-dense page).
const HydratedContext = React.createContext<boolean>(false);

export function IconLibraryProvider({
  value,
  children,
}: {
  value: IconLibraryName;
  children: React.ReactNode;
}) {
  const hydrated = useHydrated();
  return (
    <IconLibraryContext.Provider value={value}>
      <HydratedContext.Provider value={hydrated}>
        {children}
      </HydratedContext.Provider>
    </IconLibraryContext.Provider>
  );
}

export function useIconLibrary() {
  return React.useContext(IconLibraryContext);
}

// Each library's whole module, imported once on demand and cached. The named
// export indexed by an IconPlaceholder prop is the icon — a React component for
// every library except HugeIcons, whose core-free package exports raw icon data
// (an array) that must be rendered through <HugeiconsIcon>.
const importers: Record<
  IconLibraryName,
  () => Promise<Record<string, unknown>>
> = {
  lucide: () => import("lucide-react"),
  tabler: () => import("@tabler/icons-react"),
  phosphor: () => import("@phosphor-icons/react"),
  hugeicons: () => import("@hugeicons/core-free-icons"),
  remixicon: () => import("@remixicon/react"),
};

const moduleCache = new Map<IconLibraryName, Promise<Record<string, unknown>>>();

function loadLibrary(library: IconLibraryName) {
  let promise = moduleCache.get(library);
  if (!promise) {
    promise = importers[library]();
    moduleCache.set(library, promise);
  }
  return promise;
}

// `strokeWidth` is owned by the placeholder (HugeIcons needs a numeric value);
// callers style via className/size, so it is not part of the passthrough props.
type IconSvgProps = Omit<React.ComponentProps<"svg">, "strokeWidth">;

function LibraryIcon({
  library,
  name,
  ...props
}: { library: IconLibraryName; name: string } & IconSvgProps) {
  const mod = React.use(loadLibrary(library));
  const entry = mod[name];
  if (!entry) return null;

  // HugeIcons ships icon DATA (an array), not components.
  if (Array.isArray(entry)) {
    return (
      <HugeiconsIcon
        icon={entry as IconSvgElement}
        strokeWidth={2}
        {...props}
      />
    );
  }

  const Icon = entry as React.ComponentType<IconSvgProps>;
  return <Icon {...props} />;
}

// Neutral fallback while a library chunk loads (and the server/pre-hydration
// render). Kept inline so the placeholder itself forces no icon dependency.
function FallbackIcon({ className, ...props }: IconSvgProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.25"
      />
    </svg>
  );
}

type IconPlaceholderProps = Partial<Record<IconLibraryName, string>> &
  IconSvgProps;

export function IconPlaceholder({
  lucide,
  tabler,
  phosphor,
  hugeicons,
  remixicon,
  ...svgProps
}: IconPlaceholderProps) {
  const library = useIconLibrary();
  const hydrated = React.useContext(HydratedContext);

  // Server and first client render share the fallback (no hydration mismatch);
  // real glyphs resolve client-side once a library is selected.
  if (!hydrated) {
    return <FallbackIcon {...svgProps} />;
  }

  // Resolve the glyph name only after the gate (skips the work on SSR/first
  // render) and read the matching prop directly — no per-render object literal.
  const name =
    library === "lucide"
      ? lucide
      : library === "tabler"
        ? tabler
        : library === "phosphor"
          ? phosphor
          : library === "hugeicons"
            ? hugeicons
            : remixicon;
  if (!name) {
    return <FallbackIcon {...svgProps} />;
  }

  return (
    <React.Suspense fallback={<FallbackIcon {...svgProps} />}>
      <LibraryIcon library={library} name={name} {...svgProps} />
    </React.Suspense>
  );
}

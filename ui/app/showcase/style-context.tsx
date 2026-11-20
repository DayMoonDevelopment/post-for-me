"use client";

import { createContext, useContext, type ReactNode } from "react";

import { DEFAULT_CFG } from "./presets";

/**
 * The style currently selected in the configurator, provided to the preview area
 * only. The generated `~/ui/*` primitive dispatchers read it to render shadcn's
 * ACTUAL per-style component (fetched into `app/showcase/primitives/<style>/`), so
 * the canvas shows what a consumer installs for that style — not an approximation.
 * Chrome outside the provider falls back to the default style.
 */
const StyleContext = createContext<string>(DEFAULT_CFG.style);

export function StyleProvider({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return <StyleContext.Provider value={value}>{children}</StyleContext.Provider>;
}

export function useShowcaseStyle(): string {
  return useContext(StyleContext);
}

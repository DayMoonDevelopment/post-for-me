import type { ComponentType, SVGProps } from "react";

// Re-export for backward compatibility
export type ResourcePreview = {
  title: string;
  href: string;
  description: string;
};

export type SolutionPreview = {
  title: string;
  href: string;
  description: string;
};

// Icon component type
export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

// Visibility configuration
export type Visibility = {
  desktop: boolean;
  mobile: boolean;
};

// Navigation menu item types
export type NavigationLinkItem = {
  type: "link";
  label: string;
  href: string;
  visibility: Visibility;
};

export type NavigationDropdownItem = {
  type: "dropdown";
  label: string;
  fallbackHref: string;
  visibility: Visibility;
};

export type NavigationMenuItem =
  | NavigationLinkItem
  | NavigationDropdownItem;

// Social link type
export type SocialLink = {
  label: string;
  href: string;
  icon: IconComponent;
  visibility: Visibility;
};

// Action button type
export type ActionButton = {
  label: string;
  href: string;
  target?: "_blank" | "_self";
  icon?: IconComponent;
  visibility: Visibility;
  variant?: "primary" | "mono" | "destructive" | "secondary" | "outline" | "dashed" | "ghost" | "dim" | "foreground" | "inverse";
  size?: "icon" | "lg" | "md" | "sm" | "xs";
};

// Main configuration type
export type NavigationConfig = {
  menuItems: NavigationMenuItem[];
  socialLinks: SocialLink[];
  actions: ActionButton[];
  resources: {
    maxPreviewItems: number;
    viewAllText: string;
    viewAllDescription: string;
  };
  solutions: {
    maxPreviewItems: number;
    viewAllText: string;
    viewAllDescription: string;
  };
};

// Props for Navigation components
export type NavigationProps = {
  resources?: ResourcePreview[];
  solutions?: SolutionPreview[];
};

import { Link } from "~/components/link";

import {
  NavigationMenu as NavigationMenuPrimitive,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuContent,
  navigationMenuTriggerStyle,
} from "~/ui/navigation-menu";

import { navigationConfig } from "./navigation.config";

import type { ResourcePreview, SolutionPreview } from "./types";
import type { ComponentProps } from "react";

export const NavigationMenu = ({
  resources = [],
  solutions = [],
  platform,
  ...props
}: ComponentProps<typeof NavigationMenuPrimitive> & {
  resources?: ResourcePreview[];
  solutions?: SolutionPreview[];
  platform: "desktop" | "mobile";
}) => {
  // Filter menu items based on platform visibility
  const visibleMenuItems = navigationConfig.menuItems.filter(
    (item) => item.visibility[platform],
  );

  return (
    <NavigationMenuPrimitive {...props}>
      <NavigationMenuList className="gap-3 space-x-0 data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-start data-[orientation=vertical]:justify-start">
        {visibleMenuItems.map((item) => {
          if (item.type === "link") {
            return (
              <NavigationMenuItem key={item.label}>
                <Link to={item.href} className={navigationMenuTriggerStyle()}>
                  {item.label}
                </Link>
              </NavigationMenuItem>
            );
          }

          if (item.type === "dropdown") {
            // Solutions dropdown
            if (item.label === "Solutions" && solutions.length > 0) {
              return (
                <NavigationMenuItem key={item.label}>
                  <NavigationMenuTrigger>{item.label}</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-2 sm:w-100 md:w-125 lg:w-150 md:grid-cols-3">
                      {solutions
                        .slice(0, navigationConfig.solutions.maxPreviewItems)
                        .map((solution) => (
                          <ListItem
                            key={solution.title}
                            title={solution.title}
                            href={solution.href}
                          >
                            {solution.description}
                          </ListItem>
                        ))}

                      <ListItem
                        title={navigationConfig.solutions.viewAllText}
                        href={item.fallbackHref}
                        className="border border-muted/85 rounded-lg bg-muted/50"
                      >
                        {navigationConfig.solutions.viewAllDescription}
                      </ListItem>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              );
            }

            // Resources dropdown
            if (item.label === "Resources" && resources.length > 0) {
              return (
                <NavigationMenuItem key={item.label}>
                  <NavigationMenuTrigger>{item.label}</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-2 sm:w-100 md:w-125 lg:w-150 md:grid-cols-3">
                      {resources
                        .slice(0, navigationConfig.resources.maxPreviewItems)
                        .map((resource) => (
                          <ListItem
                            key={resource.title}
                            title={resource.title}
                            href={resource.href}
                          >
                            {resource.description}
                          </ListItem>
                        ))}

                      <ListItem
                        title={navigationConfig.resources.viewAllText}
                        href={item.fallbackHref}
                        className="border border-muted/85 rounded-lg bg-muted/50"
                      >
                        {navigationConfig.resources.viewAllDescription}
                      </ListItem>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              );
            }

            // Fallback to simple link if no items available
            return (
              <NavigationMenuItem key={item.label}>
                <Link to={item.fallbackHref} className={navigationMenuTriggerStyle()}>
                  {item.label}
                </Link>
              </NavigationMenuItem>
            );
          }

          return null;
        })}
      </NavigationMenuList>
    </NavigationMenuPrimitive>
  );
};

function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link to={href}>
          <div className="text-sm leading-none font-medium">{title}</div>
          <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}

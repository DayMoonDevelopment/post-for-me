import { Link } from "react-router";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from "~/ui/navigation-menu";

import type { ComponentProps } from "react";

export type ResourcePreview = {
  title: string;
  href: string;
  description: string;
};

export const NavMenu = ({
  resources = [],
  ...props
}: ComponentProps<typeof NavigationMenu> & {
  resources?: ResourcePreview[];
}) => (
  <NavigationMenu {...props}>
    <NavigationMenuList className="gap-3 space-x-0 data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-start data-[orientation=vertical]:justify-start">
      {/*
      <NavigationMenuItem>
        <NavigationMenuLink asChild>
          <Link to="/about">About</Link>
        </NavigationMenuLink>
      </NavigationMenuItem>
      */}
      <NavigationMenuItem>
        <NavigationMenuLink asChild>
          <Link to="/pricing">Pricing</Link>
        </NavigationMenuLink>
      </NavigationMenuItem>

      {resources.length ? (
        <NavigationMenuItem>
          <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-2 sm:w-[400px] md:w-[500px] md:grid-cols-3 lg:w-[600px]">
              {resources.slice(0, 5).map((resource) => (
                <ListItem
                  key={resource.title}
                  title={resource.title}
                  href={resource.href}
                >
                  {resource.description}
                </ListItem>
              ))}

              <ListItem
                title={"All Resources →"}
                href={`/resources`}
                className="border border-muted/85 rounded-lg bg-muted/50"
              >
                {`Check out all of our guides to get started immediately!`}
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      ) : (
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link to="/resources">Resources</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      )}

      <NavigationMenuItem>
        <NavigationMenuLink asChild>
          <Link to="https://api.postforme.dev/docs">Developers</Link>
        </NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenuList>
  </NavigationMenu>
);

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

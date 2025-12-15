import { Link } from "react-router";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "~/ui/navigation-menu";

import type { ComponentProps } from "react";

export const NavMenu = (props: ComponentProps<typeof NavigationMenu>) => (
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
      {/*
      <NavigationMenuItem>
        <NavigationMenuLink asChild>
          <Link to="/resources">Resources</Link>
        </NavigationMenuLink>
      </NavigationMenuItem>
      */}
      <NavigationMenuItem>
        <NavigationMenuLink asChild>
          <Link to="https://api.postforme.dev/docs">Developers</Link>
        </NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenuList>
  </NavigationMenu>
);

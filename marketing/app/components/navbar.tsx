import { Link } from "react-router";
import { BarsTwoIcon, CrossSmallIcon, BookIcon, GitHubIcon } from "icons";

import { API_URL, APP_URL, GITHUB_URL } from "~/lib/constants";

import { Button } from "~/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "~/ui/navigation-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTrigger,
} from "~/ui/drawer";

export function Navbar() {
  return (
    <header className="bg-card border rounded-lg px-4 md:px-6">
      <div className="flex h-16 items-center justify-between gap-4">
        <div className="flex flex-row gap-4">
          <Drawer direction="left">
            <DrawerTrigger asChild className="md:hidden">
              <Button variant="ghost">
                <BarsTwoIcon />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerClose asChild className="self-end">
                  <Button variant="ghost" size="icon">
                    <CrossSmallIcon />
                  </Button>
                </DrawerClose>
              </DrawerHeader>

              <div className="flex flex-col flex-1 overflow-y-auto px-4">
                {/* API Docs */}
                <DrawerClose asChild>
                  <Link
                    to={API_URL}
                    target="_blank"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    <BookIcon className="size-4" />
                    API Docs
                  </Link>
                </DrawerClose>
                <DrawerClose asChild>
                  <Link
                    to={GITHUB_URL}
                    target="_blank"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    <GitHubIcon className="size-4" />
                    GitHub
                  </Link>
                </DrawerClose>
              </div>

              <DrawerFooter className="p-4 space-y-2">
                <DrawerClose asChild>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={APP_URL}>Sign In</Link>
                  </Button>
                </DrawerClose>
                <DrawerClose asChild>
                  <Button asChild className="w-full">
                    <Link to={APP_URL}>Start for Free</Link>
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>

          <Link
            to="/"
            className="text-foreground hover:text-foreground/75 font-bold flex flex-row items-center gap-2"
          >
            <img
              src="/logo-wordmark.png"
              alt="Post for Me Logo"
              className="w-36"
            />
          </Link>

          <NavigationMenu className="max-md:hidden">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link to={API_URL} target="_blank">
                    API Docs
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-sm max-md:hidden"
          >
            <Link to={APP_URL}>Sign In</Link>
          </Button>

          <Button asChild size="sm" className="text-sm">
            <Link to={APP_URL}>Start for Free</Link>
          </Button>

          <Button asChild size="sm" variant="ghost" className="max-md:hidden">
            <Link to={GITHUB_URL} target="_blank">
              <GitHubIcon />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

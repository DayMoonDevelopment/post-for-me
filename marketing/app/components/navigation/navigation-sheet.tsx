import { IconBarsThree } from "@central-icons/outlined";

import { Link } from "~/components/link";

import { Button } from "~/ui/button";
import { ButtonGroup } from "~/ui/button-group";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "~/ui/sheet";

import { navigationConfig } from "./navigation.config";

import type { NavigationProps } from "./types";

export const NavigationSheet = ({ resources = [], solutions = [] }: NavigationProps) => {
  // Filter items visible on mobile
  const visibleMenuItems = navigationConfig.menuItems.filter(
    (item) => item.visibility.mobile,
  );

  const visibleSocialLinks = navigationConfig.socialLinks.filter(
    (link) => link.visibility.mobile,
  );

  const visibleActions = navigationConfig.actions.filter(
    (action) => action.visibility.mobile,
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <IconBarsThree />
        </Button>
      </SheetTrigger>

      <SheetContent className="px-6 py-3 flex flex-col">
        {/* Mobile Navigation Menu */}
        <nav className="mt-6 flex-1 overflow-y-auto">
          <ul className="flex flex-col gap-1">
            {visibleMenuItems.map((item) => {
              if (item.type === "link") {
                return (
                  <li key={item.label}>
                    <SheetClose asChild>
                      <Link
                        to={item.href}
                        className="block px-3 py-2.5 text-base font-medium text-foreground rounded-md transition-colors"
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  </li>
                );
              }

              if (item.type === "dropdown") {
                return (
                  <li key={item.label} className="flex flex-col gap-1">
                    <SheetClose asChild>
                      <Link
                        to={item.fallbackHref}
                        className="block px-3 py-2.5 text-base font-medium text-foreground rounded-md transition-colors"
                      >
                        {item.label}
                      </Link>
                    </SheetClose>

                    {/* Show featured solutions if this is Solutions dropdown */}
                    {item.label === "Solutions" && solutions.length > 0 ? (
                      <ul className="ml-4 flex flex-col gap-1 mt-1">
                        {solutions
                          .slice(0, navigationConfig.solutions.maxPreviewItems)
                          .map((solution) => (
                            <li key={solution.title}>
                              <SheetClose asChild>
                                <Link
                                  to={solution.href}
                                  className="block px-3 py-2 text-sm text-muted-foreground rounded-md transition-colors"
                                >
                                  {solution.title}
                                </Link>
                              </SheetClose>
                            </li>
                          ))}
                      </ul>
                    ) : null}

                    {/* Show featured resources if this is Resources dropdown */}
                    {item.label === "Resources" && resources.length > 0 ? (
                      <ul className="ml-4 flex flex-col gap-1 mt-1">
                        {resources
                          .slice(0, navigationConfig.resources.maxPreviewItems)
                          .map((resource) => (
                            <li key={resource.title}>
                              <SheetClose asChild>
                                <Link
                                  to={resource.href}
                                  className="block px-3 py-2 text-sm text-muted-foreground rounded-md transition-colors"
                                >
                                  {resource.title}
                                </Link>
                              </SheetClose>
                            </li>
                          ))}
                      </ul>
                    ) : null}
                  </li>
                );
              }

              return null;
            })}
          </ul>
        </nav>

        <SheetFooter>
          <ButtonGroup className="w-full">
            {visibleActions.map((action) => (
              <ButtonGroup key={action.label}>
                <SheetClose asChild>
                  <Button asChild variant={action.variant} size={action.size}>
                    <Link to={action.href} target={action.target || "_self"}>
                      {action.icon ? <action.icon /> : null}
                      {action.label}
                    </Link>
                  </Button>
                </SheetClose>
              </ButtonGroup>
            ))}

            <div className="flex-1" />

            {visibleSocialLinks.map((socialLink) => (
              <ButtonGroup key={socialLink.label}>
                <SheetClose asChild>
                  <Button size="icon" variant="ghost" asChild>
                    <Link to={socialLink.href}>
                      <socialLink.icon />
                    </Link>
                  </Button>
                </SheetClose>
              </ButtonGroup>
            ))}
          </ButtonGroup>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

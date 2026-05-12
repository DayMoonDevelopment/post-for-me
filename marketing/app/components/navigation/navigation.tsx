/**
 * design-note: there is a negative bottom margin so that we retain the sticky properties of the navbar while "indenting" the underlying component underneath the navbar
 */

import { Link } from "~/components/link";
import { Logo } from "~/components/logo";

import { Button } from "~/ui/button";
import { ButtonGroup } from "~/ui/button-group";

import { NavigationMenu } from "./navigation-menu";
import { NavigationSheet } from "./navigation-sheet";
import { navigationConfig } from "./navigation.config";

import type { NavigationProps } from "./types";

export const Navigation = ({ resources = [], solutions = [] }: NavigationProps) => {
  // Filter items visible on desktop
  const visibleSocialLinks = navigationConfig.socialLinks.filter(
    (link) => link.visibility.desktop,
  );

  const visibleActions = navigationConfig.actions.filter(
    (action) => action.visibility.desktop,
  );

  return (
    <nav className="h-16 bg-background border-b sticky top-0 z-25 -mb-16">
      <div className="h-full flex items-center mx-auto px-4 sm:px-6 lg:px-4">
        <div className="w-full flex items-center gap-8">
          <Link to="/">
            <Logo className="h-5.5" />
          </Link>

          {/* Desktop Menu */}
          <NavigationMenu
            className="hidden xl:block"
            platform="desktop"
            resources={resources}
            solutions={solutions}
          />

          <ButtonGroup className="ml-auto">
            {visibleActions.map((action) => (
              <ButtonGroup
                key={action.label}
                className={action.visibility.mobile ? "hidden xl:block" : undefined}
              >
                <Button asChild variant={action.variant} size={action.size}>
                  <Link to={action.href} target={action.target || "_self"}>
                    {action.icon ? <action.icon /> : null}
                    {action.label}
                  </Link>
                </Button>
              </ButtonGroup>
            ))}

            {visibleSocialLinks.map((socialLink) => (
              <ButtonGroup key={socialLink.label} className="hidden xl:block">
                <Button size="icon" variant="ghost" asChild>
                  <Link to={socialLink.href}>
                    <socialLink.icon />
                  </Link>
                </Button>
              </ButtonGroup>
            ))}

            {/* Mobile Menu */}
            <ButtonGroup className="xl:hidden">
              <NavigationSheet resources={resources} solutions={solutions} />
            </ButtonGroup>
          </ButtonGroup>
        </div>
      </div>
    </nav>
  );
};

// Re-export types for external consumers
export type { ResourcePreview, NavigationProps } from "./types";

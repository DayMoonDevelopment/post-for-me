/**
 * design-note: there is a negative bottom margin so that we retain the sticky properties of the navbar while "indenting" the underlying component underneath the navbar
 */

import { GithubIcon } from "lucide-react";

import { Button } from "~/ui/button";

import { Logo } from "~/components/logo";
import { NavMenu } from "./nav-menu";
import { NavigationSheet } from "./navigation-sheet";
import { Link } from "react-router";

import type { ResourcePreview } from "~/components/nav-menu";

export const Navbar = ({
  resources = [],
}: {
  resources?: ResourcePreview[];
}) => {
  return (
    <nav className="h-16 bg-background border-b sticky top-0 z-100 -mb-16">
      <div className="h-full flex items-center justify-between mx-auto px-4 sm:px-6 lg:px-4">
        <div className="flex items-center gap-8">
          <Link to="/">
            <Logo className="h-6" />
          </Link>

          {/* Desktop Menu */}
          <NavMenu className="hidden md:block" resources={resources} />
        </div>

        <div className="flex items-center gap-1">
          <Button asChild>
            <Link to="https://app.postforme.dev" target="_blank">
              Get Started
            </Link>
          </Button>

          <Button size="icon" variant="ghost" asChild>
            <Link
              to="https://github.com/DayMoonDevelopment/post-for-me"
              target="_blank"
            >
              <GithubIcon />
            </Link>
          </Button>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <NavigationSheet />
          </div>
        </div>
      </div>
    </nav>
  );
};

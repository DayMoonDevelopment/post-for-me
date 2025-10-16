import { GithubIcon } from "lucide-react";

import { Button } from "~/ui/button";

import { Logo } from "~/components/logo";
import { NavMenu } from "./nav-menu";
import { NavigationSheet } from "./navigation-sheet";
import { Link } from "react-router";

export const Navbar = () => {
  return (
    <nav className="h-16 bg-background border-b sticky top-0">
      <div className="h-full flex items-center justify-between max-w-(--breakpoint-2xl) mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo className="h-6" />

          {/* Desktop Menu */}
          <NavMenu className="hidden md:block" />
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

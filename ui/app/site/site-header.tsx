import type { ReactNode } from "react";

import { Link } from "react-router";

import { PostForMeWordmark } from "~/ui/post-for-me-wordmark";

/**
 * The shared, Post for Me-branded top bar (marketing + docs). Page-specific
 * controls (the docs style toggles, a marketing CTA) go in `children`,
 * right-aligned.
 */
export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between gap-4 px-5">
        {/* Leading — wordmark */}
        <Link to="/" aria-label="Post for Me" className="flex items-center">
          <PostForMeWordmark className="h-4 w-auto" />
        </Link>
        {/* Trailing — nav links + page controls */}
        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
            <Link to="/docs" className="transition-colors hover:text-foreground">
              Docs
            </Link>
            <a
              href="https://github.com/DayMoonDevelopment/post-for-me"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </nav>
          {children ? (
            <div className="flex items-center gap-2">{children}</div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

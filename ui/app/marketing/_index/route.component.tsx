import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { SiteHeader } from "~/site/site-header";
import { PostForMeIcon } from "~/ui/post-for-me-icon";

const GITHUB = "https://github.com/DayMoonDevelopment/post-for-me";

/** The lean, PFM-branded landing. Fixed brand (not style-configurable). */
export function Component() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <PostForMeIcon className="size-12 text-primary" />

        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {t("home.tagline")}
        </h1>
        <p className="max-w-xl text-lg text-pretty text-muted-foreground">
          {t("home.description")}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/docs"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("home.browse")}
          </Link>
          <a
            href={GITHUB}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-5 text-sm font-medium transition-colors hover:bg-accent"
          >
            GitHub
          </a>
        </div>

        <div className="mt-4 w-full max-w-md rounded-lg border bg-muted/40 p-4 text-start">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            {t("home.installLabel")}
          </p>
          <code className="font-mono text-sm break-all">
            npx shadcn@latest add @post-for-me/user-avatar
          </code>
        </div>
      </main>

      <footer className="border-t px-6 py-6 text-center text-xs text-muted-foreground">
        Post for Me · a Day Moon Development project
      </footer>
    </div>
  );
}

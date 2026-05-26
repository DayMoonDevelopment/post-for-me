import { IconGithub } from "@central-icons/filled";
import { IconArrowRight, IconArrowUpRight } from "@central-icons/outlined";

import { Link } from "~/components/link";

import { GITHUB_URL } from "~/lib/constants";

import { Badge } from "~/ui/badge";
import { Button } from "~/ui/button";

export const OpenSource = () => (
  <div
    id="open-source"
    className="flex items-center justify-center py-16 bg-muted"
  >
    <div className="text-center max-w-2xl px-6">
      <Badge>Open Source</Badge>
      <h2 className="mt-3 text-2xl md:text-4xl font-semibold tracking-tight max-w-xl text-balanced mx-auto">
        Built in the open, so you can trust what your product runs on.
      </h2>
      <p className="mt-4 text-base sm:text-lg text-muted-foreground">
        Every commit, every pull request, every roadmap decision is public on
        GitHub.
      </p>
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button asChild>
          <Link to="/open-source-social-media-api">
            Why we open-sourced it
            <IconArrowRight className="size-4" />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={GITHUB_URL} target="_blank">
            <IconGithub className="size-4" />
            Star on GitHub
            <IconArrowUpRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  </div>
);

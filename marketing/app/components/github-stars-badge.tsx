import { IconStar } from "@central-icons/filled";
import { IconGithub } from "@central-icons/outlined";

import { Link } from "~/components/link";

import { GITHUB_URL } from "~/lib/constants";
import { cn } from "~/lib/utils";

function formatStars(count: number): string {
  if (count >= 1000) {
    const k = count / 1000;
    return `${k.toFixed(k >= 10 ? 0 : 1)}k`;
  }
  return count.toLocaleString();
}

export const GitHubStarsBadge = ({
  stars,
  className,
}: {
  stars: number;
  className?: string;
}) => {
  return (
    <Link
      to={GITHUB_URL}
      target="_blank"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-card pl-3 pr-1 py-1 text-sm font-medium hover:bg-muted transition-colors",
        className,
      )}
      aria-label={`View Post for Me on GitHub. ${stars} stars.`}
    >
      <IconGithub className="size-4" />
      <span>Star on GitHub</span>
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
        <IconStar className="size-3" />
        {formatStars(stars)}
      </span>
    </Link>
  );
};

import { cn } from "~/lib/utils";
import { Avatar, AvatarFallback } from "~/ui/avatar";

/** First letter of a team name, for the avatar fallback. */
export function teamInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "•";
}

/**
 * The graphical team badge — a squircle {@link Avatar} carrying the team's
 * initial in the `pop` namespace. The team counterpart to `ProjectTypeAvatar`:
 * teams have no type axis to brand, so they get the one house accent.
 *
 * `className` lands on both the avatar and its fallback so a caller can set the
 * size and the text scale in one prop (`size-8 text-sm`).
 */
export function TeamAvatar({
  className,
  name,
}: {
  className?: string;
  name: string;
}) {
  return (
    <Avatar className={cn("rounded-[25%] after:rounded-[25%]", className)}>
      <AvatarFallback
        className={cn(
          "rounded-[inherit] bg-pop font-heading font-semibold text-white",
          className,
        )}
      >
        {teamInitial(name)}
      </AvatarFallback>
    </Avatar>
  );
}

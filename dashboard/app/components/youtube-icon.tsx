import { cn } from "~/lib/utils";

export function YouTubeImageIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <img
      src="/yt_icon_red_digital.png"
      alt="YouTube"
      className={cn("object-contain", className)}
      loading="lazy"
      decoding="async"
    />
  );
}

import { cn } from "~/lib/utils";

export function XLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 150 136"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className, "text-black dark:text-white")}
    >
      <path
        d="M118.072 0H140.964L90.9639 57.5301L150 135.542H103.614L67.4699 88.253L25.9036 135.542H3.01205L56.6265 74.0964L0 0H47.5904L80.4217 43.3735L118.072 0ZM109.94 121.687H122.59L40.6627 12.9518H26.8072L109.94 121.687Z"
        fill="currentColor"
      />
    </svg>
  );
}

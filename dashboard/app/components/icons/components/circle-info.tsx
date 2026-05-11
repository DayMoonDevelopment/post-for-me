import type { SVGProps } from "react";

export const CircleInfoIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <path
      fill="currentColor"
      d="M20 12a8 8 0 1 0-16 0 8 8 0 0 0 16 0m2 0c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10"
    />
    <path
      fill="currentColor"
      d="M11 16v-4a1 1 0 1 1 0-2h1l.102.005A1 1 0 0 1 13 11v5a1 1 0 1 1-2 0M12 7.25a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5"
    />
    <path
      fill="currentColor"
      d="M12.5 8a.5.5 0 1 0-1 0 .5.5 0 0 0 1 0m.5 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0"
    />
  </svg>
);

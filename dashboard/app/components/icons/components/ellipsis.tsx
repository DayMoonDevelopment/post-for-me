import type { SVGProps } from "react";

export const EllipsisIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <path
      fill="currentColor"
      d="M10 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0M18 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0M2 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0"
    />
  </svg>
);

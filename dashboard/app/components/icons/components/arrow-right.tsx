import type { SVGProps } from "react";

export const ArrowRightIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <path
      fill="currentColor"
      d="M13.293 5.293a1 1 0 0 1 1.414 0l6 6a1 1 0 0 1 0 1.414l-6 6a1 1 0 1 1-1.414-1.414L18.586 12l-5.293-5.293a1 1 0 0 1 0-1.414"
    />
    <path fill="currentColor" d="M19 11a1 1 0 1 1 0 2H4a1 1 0 1 1 0-2z" />
  </svg>
);

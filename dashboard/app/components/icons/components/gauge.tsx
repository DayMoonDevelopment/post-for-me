import type { SVGProps } from "react";

export const GaugeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <path
      fill="currentColor"
      d="M13.5 12a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0M11 5V3a1 1 0 0 1 1-1c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12c0-1.167.2-2.29.57-3.333a1 1 0 0 1 1.885.666A8 8 0 1 0 13 4.063V5a1 1 0 1 1-2 0m4.5 7a3.5 3.5 0 1 1-6.58-1.665L5.044 6.457l-.068-.076A1 1 0 0 1 6.38 4.975l.076.068 3.878 3.878A3.5 3.5 0 0 1 15.5 12"
    />
  </svg>
);

import type { SVGProps } from "react";

export const CheckmarkSmallIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <path
      fill="currentColor"
      d="M16.247 7.342a1 1 0 0 1 1.506 1.316l-7 8a1 1 0 0 1-1.46.049l-3-3a1 1 0 0 1 1.338-1.482l.076.068 2.244 2.244z"
    />
  </svg>
);

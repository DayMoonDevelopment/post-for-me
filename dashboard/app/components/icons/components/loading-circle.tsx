import type { SVGProps } from "react";

export const LoadingCircleIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <path
      fill="currentColor"
      fillOpacity={0.3}
      d="M20 12a8 8 0 1 0-16 0 8 8 0 0 0 16 0m2 0c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10"
    />
    <path
      fill="currentColor"
      d="M21.055 12.006c.549.06.945.555.884 1.104a10.005 10.005 0 0 1-8.829 8.83 1.001 1.001 0 0 1-.22-1.989 8.005 8.005 0 0 0 7.061-7.061 1 1 0 0 1 1.104-.884"
    />
  </svg>
);

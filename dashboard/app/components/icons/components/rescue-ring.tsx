import type { SVGProps } from "react";

export const RescueRingIcon = (props: SVGProps<SVGSVGElement>) => (
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
      d="M15 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0m2 0a5 5 0 1 1-10 0 5 5 0 0 1 10 0"
    />
    <path
      fill="currentColor"
      d="m19.208 6.207-3.634 3.634-1.414-1.414 3.634-3.634zM9.836 15.578l-3.629 3.629-1.414-1.414 3.629-3.629zM9.836 8.422 8.422 9.836 4.793 6.207l1.414-1.414zM19.208 17.793l-1.414 1.414-3.634-3.634 1.414-1.414z"
    />
  </svg>
);

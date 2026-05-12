import type { SVGProps } from "react";

export const CopyIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <path
      fill="currentColor"
      d="M14 9V4.25a.25.25 0 0 0-.25-.25h-9.5a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25H9a1 1 0 1 1 0 2H4.25A2.25 2.25 0 0 1 2 13.75v-9.5A2.25 2.25 0 0 1 4.25 2h9.5A2.25 2.25 0 0 1 16 4.25V9a1 1 0 1 1-2 0"
    />
    <path
      fill="currentColor"
      d="M20 10.25a.25.25 0 0 0-.25-.25h-9.5a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25zm2 9.5A2.25 2.25 0 0 1 19.75 22h-9.5A2.25 2.25 0 0 1 8 19.75v-9.5A2.25 2.25 0 0 1 10.25 8h9.5A2.25 2.25 0 0 1 22 10.25z"
    />
  </svg>
);

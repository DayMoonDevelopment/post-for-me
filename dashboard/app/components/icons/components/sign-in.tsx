import type { SVGProps } from "react";

export const SignInIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <path
      fill="currentColor"
      d="M19 18V6a1 1 0 0 0-1-1h-3a1 1 0 1 1 0-2h3a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-3a1 1 0 1 1 0-2h3a1 1 0 0 0 1-1"
    />
    <path
      fill="currentColor"
      d="M10.293 7.793a1 1 0 0 1 1.414 0l3.5 3.5a1 1 0 0 1 0 1.414l-3.5 3.5a1 1 0 1 1-1.414-1.414L13.086 12l-2.793-2.793a1 1 0 0 1 0-1.414"
    />
    <path fill="currentColor" d="M13.5 11a1 1 0 1 1 0 2H4a1 1 0 1 1 0-2z" />
  </svg>
);

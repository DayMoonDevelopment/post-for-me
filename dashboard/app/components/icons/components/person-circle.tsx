import type { SVGProps } from "react";

export const PersonCircleIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <path
      fill="currentColor"
      d="M20 12a8 8 0 1 0-13.932 5.365C7.563 15.895 9.613 15 12 15s4.437.896 5.93 2.365A7.97 7.97 0 0 0 20 12m-8 5c-1.79 0-3.296.637-4.41 1.675A7.96 7.96 0 0 0 12 20a7.96 7.96 0 0 0 4.41-1.326C15.296 17.636 13.79 17 12 17m10-5a9.97 9.97 0 0 1-3.074 7.213l-.388.353A9.97 9.97 0 0 1 12 22a9.96 9.96 0 0 1-6.203-2.156l-.335-.278A9.98 9.98 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10"
    />
    <path
      fill="currentColor"
      d="M14 10a2 2 0 1 0-4 0 2 2 0 0 0 4 0m2 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0"
    />
  </svg>
);

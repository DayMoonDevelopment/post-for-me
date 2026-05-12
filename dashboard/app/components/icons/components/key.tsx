import type { SVGProps } from "react";

export const KeyIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <path fill="currentColor" d="M14.5 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3" />
    <path
      fill="currentColor"
      d="M19 8.5a4.5 4.5 0 1 0-8.866 1.095l.023.128a1 1 0 0 1-.286.82l-5.578 5.578a1 1 0 0 0-.293.707V19h2.172a1 1 0 0 0 .707-.293L8 17.586V15.5a1 1 0 0 1 1-1h2.086l1.37-1.371.099-.086a1 1 0 0 1 .85-.177q.526.132 1.095.134A4.5 4.5 0 0 0 19 8.5m2 0a6.5 6.5 0 0 1-6.5 6.5c-.342 0-.677-.03-1.006-.081l-1.287 1.288a1 1 0 0 1-.707.293H10V18a1 1 0 0 1-.293.707l-1.414 1.414A3 3 0 0 1 6.172 21H4a2 2 0 0 1-2-2v-2.172a3 3 0 0 1 .879-2.121L8.08 9.505A6.5 6.5 0 1 1 21 8.5"
    />
  </svg>
);

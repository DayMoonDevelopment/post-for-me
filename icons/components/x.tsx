import type { SVGProps } from "react";

export const XIcon = ({ className, style, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ color: "#000000", ...style }}
    {...props}
  >
    <path
      fill="currentColor"
      d="M17.403 3.5h2.882l-6.296 7.201 7.407 9.799h-5.8l-4.542-5.943L5.856 20.5H2.973l6.734-7.702L2.602 3.5h5.946l4.106 5.432zm-1.011 15.274h1.597L7.68 5.135H5.967z"
    />
  </svg>
);

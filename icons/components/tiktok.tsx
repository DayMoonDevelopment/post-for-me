import type { SVGProps } from "react";

export const TikTokIcon = ({ className, style, ...props }: SVGProps<SVGSVGElement>) => (
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
      d="M20.715 10.213a8.2 8.2 0 0 1-4.772-1.526v6.986A6.33 6.33 0 0 1 9.612 22a6.3 6.3 0 0 1-3.524-1.07A6.329 6.329 0 0 1 10.48 9.405v3.499a2.895 2.895 0 1 0 2.017 2.769V2h3.445v.44q.018.198.052.393a4.79 4.79 0 0 0 4.72 3.957z"
    />
  </svg>
);

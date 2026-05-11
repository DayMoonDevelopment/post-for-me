import { cn } from "~/lib/utils";

import type { SVGProps } from "react";

export function PostForMeBrandIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-foreground size-5", className)}
      viewBox="0 0 1145 1323"
      fill="none"
      {...props}
    >
      <g fill="currentColor">
        <path d="M971.806 230.433 798.649 330.438l173.169 99.984v200.195L1145 530.627V330.433zM.537 330.436l173.169 100.005v200.207l173.182-100.005V330.436l-173.207-99.97zM399.574 100.024l173.182 100.005v200.194l173.169-99.989V100.027L572.743.042zM399.574 561.875l173.182 100v200.194l173.169-100.004V561.87l-173.182-99.99zM399.574 1022.21l173.182 99.99v200.19l173.169-99.99v-200.19L572.743 922.201zM798.649 791.786l173.169 100.005v200.169L1145 991.956v-200.17L971.806 691.782zM.537 791.786l173.169 100.005v200.199l173.182-100.004V791.791l-173.207-99.984z" />
      </g>
    </svg>
  );
}

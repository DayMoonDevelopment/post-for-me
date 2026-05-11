import { useLoaderData } from "react-router";

import type { Route } from "../+types/route";

export const PricingTable = () => {
  const { comparison } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="bg-muted">
      <div className="max-w-(--breakpoint-xl) w-full py-16 px-4 mx-auto">
        <div className="flex flex-col gap-12 max-w-4xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-[-0.03em] mb-4">
              Getting Started Pricing
            </h2>
            <p className="text-muted-foreground text-lg text-balance">
              Transparent pricing that scales with your post volume, including unlimited admin seats, unlimited social media accounts, free media storage, and more.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full table-fixed bg-card">
              <thead className="border-b">
                <tr className="bg-muted/30">
                  <th className="text-left p-4 font-semibold w-1/4"></th>
                  <th className="text-left p-4 font-semibold w-[37.5%]">
                    <div className="flex items-center gap-2">
                      Post for Me
                    </div>
                  </th>
                  <th className="text-left p-4 font-semibold w-[37.5%]">{comparison.competitor.name}</th>
                </tr>
              </thead>
              <tbody>
                {comparison.pricing.rows.map((row, index) => (
                  <tr key={row.label} className={index < comparison.pricing.rows.length - 1 ? "border-b" : ""}>
                    <td className="p-4 font-medium">{row.label}</td>
                    <td className="p-4">
                      <span className="text-sm">{row.pfm}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">{row.competitor}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4 text-balance">
              {`Post for Me pricing is a fixed cost each month based on the number of successful posts that are delivered to social media platforms. We don't charge based on social sets, seats, or connect accounts.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

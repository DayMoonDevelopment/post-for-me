import { useLoaderData } from "react-router";

import { Launchpad } from "~/components/launchpad";

import type { loader } from "./route.loader";

/**
 * The dashboard home is the launchpad: the persistent setup checklist plus the
 * URL-driven guided-tour modal. A returning Stripe checkout (or the sidebar
 * debug entry) lands here with `?setup=tour` to open the guided tour.
 */
export function Component() {
  const { setup } = useLoaderData<typeof loader>();
  return (
    <div className="grid grid-cols-12 p-4">
      <div className="col-span-5">
        <Launchpad context={setup} />
      </div>
    </div>
  );
}

import { useLoaderData, useNavigate, Link } from "react-router";

import { BrandIcon } from "~/components/brand-icon";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/ui/dialog";
import type { Route } from "./+types/route";

export function Component() {
  const { setupGuideUrl } = useLoaderData<Route.ComponentProps["loaderData"]>();
  const navigate = useNavigate();

  const handleClose = () => {
    navigate(`..`);
  };

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center text-center gap-3">
            <BrandIcon brand="bluesky" className="h-[100px] w-[100px]" />
            <div className="space-y-1">
              <DialogTitle>Setup Bluesky</DialogTitle>
              <DialogDescription>
                {`There is no manual setup required for connecting with Bluesky accounts. Learn more in the `}
                <Link
                  to={setupGuideUrl}
                  target="_blank"
                  className="underline underline-offset-2 text-accent-foreground hover:cursor-pointer"
                >
                  setup guide
                </Link>
                .
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

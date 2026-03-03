import { useLoaderData, useNavigate, Link } from "react-router";

import { BrandIcon } from "~/components/brand-icon";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/ui/dialog";
import { Separator } from "~/ui/separator";

import { CredentialsForm } from "./_credentials-form";
import { CopyableValues } from "./_copyable-values";
import { VerificationFiles } from "./_verification-files";

import type { Route } from "./+types/route";

export function Component() {
  const { setupGuideUrl } = useLoaderData<Route.ComponentProps["loaderData"]>();
  const navigate = useNavigate();

  const handleClose = () => {
    navigate(`..`);
  };

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-screen overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col items-center text-center gap-3">
            <BrandIcon brand="tiktok" className="h-[100px] w-[100px]" />
            <div className="space-y-1">
              <DialogTitle>Setup TikTok</DialogTitle>
              <DialogDescription>
                {`Learn more in the `}
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

        <div className="w-full min-w-0">
          <CopyableValues />

          <Separator className="my-6" />

          <VerificationFiles />

          <Separator className="my-6" />

          <CredentialsForm />
        </div>
      </DialogContent>
    </Dialog>
  );
}

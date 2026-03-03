import { useNavigate, Link } from "react-router";

import { BrandIcon } from "~/components/brand-icon";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/ui/dialog";

export function Component() {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate(`..`);
  };

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center text-center gap-3">
            <BrandIcon brand="tiktok" className="h-[100px] w-[100px]" />
            <div className="space-y-1">
              <DialogTitle>Setup TikTok Business</DialogTitle>
              <DialogDescription>
                {`Full integration coming soon. If interested in early accesss contact us at: `}
                <Link
                  to={`mailto:postforme@daymoon.dev`}
                  target="_blank"
                  className="underline underline-offset-2 text-accent-foreground hover:cursor-pointer"
                >
                  postforme@daymoon.dev
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

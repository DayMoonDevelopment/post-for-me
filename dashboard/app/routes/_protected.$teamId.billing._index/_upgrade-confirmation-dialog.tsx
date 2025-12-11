import { useFetcher } from "react-router";
import { TriangleExclamationIcon } from "icons";

import { Button } from "~/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/ui/dialog";

interface UpgradeConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tierIndex: number;
  tierPosts: number;
  tierPrice: number;
}

export function UpgradeConfirmationDialog({
  isOpen,
  onClose,
  tierIndex,
  tierPosts,
  tierPrice,
}: UpgradeConfirmationDialogProps) {
  const fetcher = useFetcher();

  const handleConfirm = async () => {
    await fetcher.submit(
      { action: "upgrade_from_legacy", tierIndex: tierIndex.toString() },
      { method: "POST" },
    );
    onClose();
  };

  const isLoading = fetcher.state !== "idle";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleExclamationIcon className="w-5 h-5 text-amber-500" />
            Upgrade to New Pro Plan
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-3">
              <p>
                Your subscription will be immediately upgraded to the Pro plan
                with {tierPosts.toLocaleString()} posts/month at ${tierPrice}
                /month.
              </p>
              <p className="font-medium">
                You will be charged a prorated amount for the remainder of your
                current billing period, and your new plan will take effect
                immediately.
              </p>
              {tierPosts >= 1000 ? (
                <p className="text-sm">
                  The new Pro plan includes system credentials at no additional
                  cost.
                </p>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Upgrading..." : "Confirm Upgrade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

interface AddonConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  hasAddon: boolean;
}

export function AddonConfirmationDialog({
  isOpen,
  onClose,
  hasAddon,
}: AddonConfirmationDialogProps) {
  const fetcher = useFetcher();

  const handleConfirm = async () => {
    await fetcher.submit(
      { action: hasAddon ? "remove_addon" : "add_addon" },
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
            {hasAddon ? "Remove Quickstart Project" : "Add Quickstart Project"}
          </DialogTitle>
          <DialogDescription>
            {hasAddon ? (
              <>
                Are you sure you want to remove the Quickstart Project addon?
                This will remove the $10/month charge and you will no longer be
                able to use our managed credentials after your current
                subscription period ends.
              </>
            ) : (
              <>
                This will add the Quickstart Project addon to your subscription
                for $10/month. You&apos;ll be able to create Quickstart Projects
                that use our managed social media credentials without setting up
                your own API keys.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            variant={hasAddon ? "destructive" : "default"}
          >
            {isLoading
              ? "Processing..."
              : hasAddon
                ? "Remove Addon"
                : "Add Addon"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

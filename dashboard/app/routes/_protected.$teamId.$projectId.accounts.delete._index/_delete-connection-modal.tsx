import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";

import { useForm as useFormFetcher } from "~/hooks/use-form";
import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";
import { Button } from "~/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/ui/dialog";

interface LocationState {
  connection?: {
    id: string;
    provider?: string;
    social_provider_user_name?: string;
  };
}

export function DeleteConnectionModal() {
  const [confirmed, setConfirmed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { teamId, projectId } = useParams();
  const { fetcher, isSubmitting } = useFormFetcher();

  const state = location.state as LocationState | null;
  const connectionId = state?.connection?.id;
  const provider = state?.connection?.provider;
  const username = state?.connection?.social_provider_user_name;

  const open = !!connectionId;

  const handleClose = () => {
    navigate(`/${teamId}/${projectId}/accounts`, { replace: true });
  };

  const handleConfirm = () => {
    if (!connectionId || !confirmed) return;

    const formData = new FormData();
    formData.append("connectionId", connectionId);
    formData.append("confirmed", "true");

    fetcher.submit(formData, {
      method: "POST",
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Delete Social Media Account</DialogTitle>
          <DialogDescription>
            This permanently deletes the {provider || "social"} account{" "}
            {username ? `(@${username})` : ""}.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTitle>Post history will be lost</AlertTitle>
          <AlertDescription>
            Fully deleting this account removes historical data for this social
            account. To preserve historical data, cancel and use Disconnect
            Account instead.
          </AlertDescription>
        </Alert>

        <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-border accent-destructive"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>
            I understand this will permanently delete the account and remove its
            historical post data.
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!confirmed || isSubmitting}
          >
            {isSubmitting ? "Deleting..." : "Delete Account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

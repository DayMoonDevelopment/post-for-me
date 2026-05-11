import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { Button } from "~/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/ui/dialog";

import { useForm } from "~/hooks/use-form";
import { Alert, AlertDescription } from "~/ui/alert";
import { TriangleExclamationIcon } from "~/components/icons";

export function Component() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { Form, isSubmitting, errors } = useForm();

  const keyId = searchParams.get("key_id");
  const title = `Delete API Key`;
  const description = `This API key will be permanently deleted and can no longer be used to access the API. This action cannot be undone.`;

  function goBack() {
    navigate(-1);
  }

  useEffect(() => {
    if (!searchParams.has("key_id")) {
      goBack();
    }
  }, [searchParams]);

  return (
    <Dialog open onOpenChange={goBack}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Form method="post" className="grid gap-6">
          <p className="empty:hidden italic text-destructive text-sm">
            {errors.general}
          </p>

          <input type="hidden" name="keyId" value={`${keyId}`} />

          <Alert variant="destructive">
            <TriangleExclamationIcon />
            <AlertDescription>
              Any posts that are scheduled to be published using this API key
              will be rejected and not post.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              type="submit"
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              Delete API Key
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLoaderData, useNavigate, Link } from "react-router";
import { useEffect, useState } from "react";

import { useForm as useFormFetcher } from "~/hooks/use-form";
import { getProviderLabel } from "~/lib/utils";

import { BrandIcon } from "~/components/brand-icon";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/ui/dialog";
import { Form } from "~/ui/form";
import { Button } from "~/ui/button";

import { CredentialInput } from "./_credential-input";
import { RedirectUrl } from "./_redirect-url";

import type { Route } from "./+types/route";
import { Separator } from "~/ui/separator";

const defaultLabels = {
  instagram: { appId: "App ID", appSecret: "App Secret" },
  facebook: { appId: "App ID", appSecret: "App Secret" },
  tiktok: { appId: "Client Key", appSecret: "Client Secret" },
  x: { appId: "Client ID", appSecret: "Client Secret" },
  youtube: { appId: "Google Client ID", appSecret: "Google Client Secret" },
  linkedin: { appId: "Client ID", appSecret: "Client Secret" },
  pinterest: { appId: "App ID", appSecret: "App Secret" },
  threads: { appId: "App ID", appSecret: "App Secret" },
  bluesky: { appId: "App ID", appSecret: "App Secret" },
} as const;

const providerSetupSchema = z
  .object({
    app_id: z.string().optional(),
    app_secret: z.string().optional(),
  })
  .refine(
    (data) =>
      (data.app_id && data.app_id.trim() !== "") ||
      (data.app_secret && data.app_secret.trim() !== ""),
    {
      message: "At least one credential (App ID or App Secret) is required",
      path: ["app_id"],
    }
  );

type ProviderSetupFormValues = z.infer<typeof providerSetupSchema>;

export function Component() {
  const { setupGuideUrl, credential, provider } =
    useLoaderData<Route.ComponentProps["loaderData"]>();

  const navigate = useNavigate();
  const { fetcher, isSubmitting } = useFormFetcher({ withToast: true });

  const [initialValues, setInitialValues] = useState<ProviderSetupFormValues>(
    () => ({
      app_id: credential?.appId || "",
      app_secret: credential?.appSecret || "",
    })
  );

  const [lastIntent, setLastIntent] = useState<"save" | "delete" | null>(null);

  // Determine if we have existing values
  const hasExistingValues = !!(credential?.appId || credential?.appSecret);

  // Start in edit mode if no existing values, readonly mode if there are values
  const [isEditMode, setIsEditMode] = useState(!hasExistingValues);

  const providerLabels = defaultLabels[
    provider as keyof typeof defaultLabels
  ] || {
    appId: "App ID",
    appSecret: "App Secret",
  };

  const form = useForm<ProviderSetupFormValues>({
    resolver: zodResolver(providerSetupSchema),
    defaultValues: {
      app_id: initialValues.app_id,
      app_secret: initialValues.app_secret,
    },
    disabled: !isEditMode,
  });

  const onSubmit = (values: ProviderSetupFormValues, event?: unknown) => {
    const formData = new FormData();
    formData.append("provider", provider);

    const submitter = (event as { nativeEvent?: SubmitEvent } | undefined)
      ?.nativeEvent?.submitter as HTMLButtonElement | null;
    const action = submitter?.value === "delete" ? "delete" : "save";
    setLastIntent(action);
    formData.append("action", action);

    if (values.app_id && values.app_id.trim() !== "") {
      formData.append("app_id", values.app_id);
    }

    if (values.app_secret && values.app_secret.trim() !== "") {
      formData.append("app_secret", values.app_secret);
    }

    fetcher.submit(formData, { method: "post" });
  };

  const handleClose = () => {
    navigate(`..`);
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancel = () => {
    // Reset form to original values
    form.reset({
      app_id: initialValues.app_id,
      app_secret: initialValues.app_secret,
    });

    setIsEditMode(false);
  };

  // Handle successful submission
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      if (lastIntent === "delete") {
        const clearedValues = { app_id: "", app_secret: "" };
        setInitialValues(clearedValues);
        form.reset(clearedValues);
        setIsEditMode(true);
      } else {
        const nextValues = form.getValues();
        setInitialValues(nextValues);
        form.reset(nextValues);
        setIsEditMode(false);
      }
    }
  }, [fetcher.state, fetcher.data, form, lastIntent]);

  const submitLoading = isSubmitting;
  const submitDisabled = !form.formState.isDirty || submitLoading;

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrandIcon brand={provider.split("_")[0]} className="size-5" />
            Setup {getProviderLabel(provider)}
          </DialogTitle>
          <DialogDescription>
            {"Learn more in the "}
            <Link
              to={setupGuideUrl}
              target="_blank"
              className="underline underline-offset-2 text-accent-foreground hover:cursor-pointer"
            >
              setup guide
            </Link>
            .
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 w-full min-w-0"
          >
            <RedirectUrl />

            <Separator className="my-6" />

            <CredentialInput
              name="app_id"
              label={providerLabels.appId}
              placeholder={providerLabels.appId}
            />

            <CredentialInput
              name="app_secret"
              label={providerLabels.appSecret}
              placeholder={providerLabels.appSecret}
              type="password"
            />

            <div className="text-sm text-destructive empty:hidden">
              {form.formState.errors?.app_id?.message}
            </div>

            <div className="flex justify-end gap-2">
              {!isEditMode ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleEdit}
                  >
                    Edit
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    loading={submitLoading}
                    value="delete"
                  >
                    Delete
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="ghost" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={submitLoading}
                    disabled={submitDisabled}
                  >
                    Save Configuration
                  </Button>
                </>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

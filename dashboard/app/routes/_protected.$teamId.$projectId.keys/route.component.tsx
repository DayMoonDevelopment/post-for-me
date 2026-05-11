import { Outlet, useRouteLoaderData } from "react-router";

import { useForm } from "~/hooks/use-form";

import { KeyIcon } from "~/components/icons";

import { Button } from "~/ui/button";

import { ApiKeys } from "./_api-keys";
import { CreatedDialog } from "./_created-dialog";

import type { loader } from "~/routes/_protected.$teamId/route";
import type { loader as projectData } from "~/routes/_protected.$teamId.$projectId/route";

export function Component() {
  const loaderData = useRouteLoaderData<typeof loader>(
    "routes/_protected.$teamId",
  );

  const projectLoaderData = useRouteLoaderData<typeof projectData>(
    "routes/_protected.$teamId.$projectId",
  );

  const { Form, isSubmitting } = useForm({
    key: "create-api-key",
    withToast: true,
  });

  const billingActive = loaderData?.billing?.active || false;
  const createButtonDisabled =
    !billingActive ||
    isSubmitting ||
    (projectLoaderData?.project?.is_system &&
      !loaderData?.billing?.creds_addon);
  const createButtonLoading = isSubmitting;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="px-1">
          <h2 className="font-semibold text-lg">API Keys</h2>
          {billingActive ? null : (
            <p className="text-sm text-muted-foreground italic">
              You will not be able to use your API keys until billing is active.
            </p>
          )}
          <p className="text-sm text-muted-foreground italic">
            API keys should never be exposed to the end user
          </p>
        </div>

        <Form method="post">
          <Button
            type="submit"
            loading={createButtonLoading}
            disabled={createButtonDisabled}
          >
            <KeyIcon />
            <span>Create API Key</span>
          </Button>
        </Form>
      </div>

      <ApiKeys />

      <CreatedDialog />

      <Outlet />
    </div>
  );
}

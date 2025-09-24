import { useLoaderData } from "react-router";

import {
  Copyable,
  CopyableContent,
  CopyableIcon,
  CopyableTrigger,
} from "~/ui/copyable";

import { Label } from "~/ui/label";

import type { Route } from "./+types/route";

export function RedirectUrl() {
  const { redirectUrl } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="space-y-2 w-full">
      <Label htmlFor="redirect-url">Redirect URL</Label>
      <Copyable value={redirectUrl}>
        <CopyableTrigger>
          <CopyableContent />
          <CopyableIcon />
        </CopyableTrigger>
      </Copyable>
    </div>
  );
}

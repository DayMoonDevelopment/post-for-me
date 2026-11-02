import { Outlet } from "react-router";

import { PostForMeWordmark } from "~/icons";

export function Component() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted p-6 md:p-10">
      <PostForMeWordmark className="h-6" />
      <div className="w-full max-w-sm md:max-w-4xl">
        <Outlet />
      </div>
    </div>
  );
}

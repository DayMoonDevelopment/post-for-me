import { Outlet } from "react-router";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "~/ui/sidebar";

import { ResourcesSidebar } from "./components/resources-sidebar";

export function Component() {
  return (
    <div className="h-screen relative">
      <SidebarProvider>
        <ResourcesSidebar />
        <SidebarInset>
          <div className="space-x-4">
            <SidebarTrigger className="-ml-1" />
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

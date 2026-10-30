import { Link, Outlet, useParams } from "react-router";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "~/ui/sidebar";

import { demoOrder, demos } from "./components/demos";

/**
 * Dev-only UI showcase — a shadcn-style two-pane layout: the component list in
 * the sidebar, the active demo on the canvas (`SidebarInset`). The header bar is
 * pinned (the inset is fixed to the viewport height); only the canvas beneath it
 * scrolls. The `_index` route redirects to the first component, so the canvas
 * always has a demo. Registered only in dev (see `routes.ts`).
 */
export function Component() {
  const { component } = useParams();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="gap-0.5 p-3">
          <span className="font-heading text-sm font-semibold text-foreground">
            UI Showcase
          </span>
          <span className="text-xs text-muted-foreground">
            Dev-only · <code>app/ui</code>
          </span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Components</SidebarGroupLabel>
            <SidebarMenu>
              {demoOrder.map((name) => (
                <SidebarMenuItem key={name}>
                  <SidebarMenuButton
                    render={<Link to={`/showcase/${name}`} />}
                    isActive={component === name}
                  >
                    <span>{demos[name].title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {/* Fixed to the viewport height so the header stays put and only the
          canvas scrolls. */}
      <SidebarInset className="h-svh overflow-hidden">
        <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
          <SidebarTrigger className="-ms-1" />
          <span className="text-xs font-medium text-muted-foreground">
            UI Showcase
          </span>
        </header>
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-3xl px-6 py-6">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

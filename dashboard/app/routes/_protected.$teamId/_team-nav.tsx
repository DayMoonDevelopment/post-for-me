import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "~/ui/sidebar";

import { PeopleIcon, SquareGridCircleIcon, PencilLineIcon } from "icons";
import { Link, useParams } from "react-router";

const items = [
  {
    title: "Projects",
    url: "#",
    icon: SquareGridCircleIcon,
  },
  {
    title: "Members",
    url: "members",
    icon: PeopleIcon,
  },
  {
    title: "Team Details",
    url: "edit",
    icon: PencilLineIcon,
  },
];

export function TeamNav() {
  const { teamId } = useParams();

  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild>
            <Link to={`/${teamId}/${item.url}`} prefetch="intent">
              <item.icon />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "~/ui/sidebar";

import {
  PeopleIcon,
  SquareGridCircleIcon,
  PencilLineIcon,
  BookIcon,
} from "icons";
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
  {
    title: "Usage",
    url: "usage",
    icon: BookIcon,
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

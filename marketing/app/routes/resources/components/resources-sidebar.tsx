import * as React from "react";
import { Link } from "react-router";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "~/ui/sidebar";

import type { Category, Post } from "~/lib/.server/marble.types";

interface ResourcesSidebarProps extends React.ComponentProps<typeof Sidebar> {
  categories: Category[];
  posts: Post[];
}

export function ResourcesSidebar({
  categories,
  posts,
  ...props
}: ResourcesSidebarProps) {
  // Group posts by category
  const postsByCategory = posts.reduce(
    (acc, post) => {
      const categoryId = post.category.id;
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      acc[categoryId].push(post);
      return acc;
    },
    {} as Record<string, Post[]>,
  );

  return (
    <Sidebar {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {categories.map((category) => {
                const categoryPosts = postsByCategory[category.id] || [];
                return (
                  <SidebarMenuItem key={category.id}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={`/resources/${category.slug}`}
                        className="font-medium"
                      >
                        {category.name}
                      </Link>
                    </SidebarMenuButton>
                    {categoryPosts.length > 0 ? (
                      <SidebarMenuSub>
                        {categoryPosts.map((post) => (
                          <SidebarMenuSubItem key={post.id}>
                            <SidebarMenuSubButton asChild>
                              <Link
                                to={`/resources/${category.slug}/${post.slug}`}
                                className="whitespace-normal leading-tight py-2 h-auto min-h-8"
                              >
                                {post.title}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

import * as React from "react";
import { Link } from "~/components/link";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "~/ui/sidebar";

import type { Tag, Post } from "~/lib/.server/marble.types";

interface ResourcesSidebarProps extends React.ComponentProps<typeof Sidebar> {
  tags: Tag[];
  posts: Post[];
}

export function ResourcesSidebar({
  tags,
  posts,
  ...props
}: ResourcesSidebarProps) {
  // Group posts by tag
  const postsByTag = posts.reduce(
    (acc, post) => {
      post.tags.forEach((tag) => {
        if (!acc[tag.id]) {
          acc[tag.id] = [];
        }
        acc[tag.id].push(post);
      });
      return acc;
    },
    {} as Record<string, Post[]>,
  );

  return (
    <Sidebar {...props}>
      <SidebarContent>
        {tags.map((tag) => {
          const tagPosts = postsByTag[tag.id] || [];
          if (tagPosts.length === 0) return null;

          return (
            <SidebarGroup key={tag.id} className="border-b">
              <SidebarGroupLabel>{tag.name}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {tagPosts.map((post) => (
                    <SidebarMenuItem key={post.id}>
                      <SidebarMenuButton asChild>
                        <Link
                          to={`/resources/${post.slug}`}
                          className="whitespace-normal leading-tight py-2 h-auto min-h-8"
                        >
                          {post.title}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

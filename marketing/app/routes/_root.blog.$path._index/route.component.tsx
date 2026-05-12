import { IconChevronLeft } from "@central-icons/outlined";
import { IconGlobe, IconGithub } from "@central-icons/outlined";
import { format } from "date-fns";
import { Link as RouterLink, useLoaderData } from "react-router";

import { BlueskyBrandIcon } from "~/components/bluesky-brand-icon";
import { FacebookBrandIcon } from "~/components/facebook-brand-icon";
import { InstagramBrandIcon } from "~/components/instagram-brand-icon";
import { Link } from "~/components/link";
import { LinkedInBrandIcon } from "~/components/linkedin-brand-icon";
import { PinterestBrandIcon } from "~/components/pinterest-brand-icon";
import { RawHtml } from "~/components/raw-html";
import { ThreadsBrandIcon } from "~/components/threads-brand-icon";
import { TikTokBrandIcon } from "~/components/tiktok-brand-icon";
import { XBrandIcon } from "~/components/x-brand-icon";
import { YouTubeBrandIcon } from "~/components/youtube-brand-icon";

import { parseSocialLink } from "~/lib/social-links";
import { extractYouTubeId } from "~/lib/utils";

import { Button } from "~/ui/button";

import type { Route } from "./+types/route";

function getSocialIcon(platform: string) {
  switch (platform) {
    case "x":
    case "twitter":
      return <XBrandIcon />;
    case "linkedin":
      return <LinkedInBrandIcon />;
    case "github":
      return <IconGithub />;
    case "facebook":
      return <FacebookBrandIcon />;
    case "instagram":
      return <InstagramBrandIcon />;
    case "youtube":
      return <YouTubeBrandIcon />;
    case "tiktok":
      return <TikTokBrandIcon />;
    case "pinterest":
      return <PinterestBrandIcon />;
    case "bluesky":
      return <BlueskyBrandIcon />;
    case "threads":
      return <ThreadsBrandIcon />;
    default:
      return <IconGlobe />;
  }
}

export default function BlogPost() {
  const { post, relatedPosts } =
    useLoaderData<Route.ComponentProps["loaderData"]>();

  const coverVideoId = post.coverVideo
    ? extractYouTubeId(post.coverVideo)
    : null;

  return (
    <div className="container mx-auto px-4 pt-24 max-w-7xl">
      {/* Article */}
      <article className="max-w-4xl mx-auto">
        <Button asChild mode="link" className="mb-6">
          <RouterLink to="/blog">
            <IconChevronLeft />
            All posts
          </RouterLink>
        </Button>

        {/* Cover Video (YouTube) — takes priority over cover image */}
        {coverVideoId ? (
          <div className="mb-8 relative w-full aspect-video rounded-lg overflow-hidden border">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${coverVideoId}`}
              title={post.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full"
            />
          </div>
        ) : post.coverImage ? (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-auto aspect-video object-cover"
            />
          </div>
        ) : null}

        {/* Article Header */}
        <header className="mb-8 pb-8 border-b">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-6 mr-18">
            {post.title}
          </h1>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-2.5 text-sm text-muted-foreground">
            {post.publishedAt ? (
              <time dateTime={post.publishedAt.toISOString()}>
                {format(post.publishedAt, "MMMM d, yyyy")}
              </time>
            ) : null}

            {/* Authors */}
            {post.authors.length > 0 ? (
              <>
                <span aria-hidden="true">•</span>
                <div className="flex flex-wrap items-center gap-2.5">
                  {post.authors.map((author, index) => {
                    const parsedSocials = author.socials.map((social) =>
                      parseSocialLink(social.url, social.platform),
                    );

                    return (
                      <div key={author.id} className="flex items-center gap-2">
                        {index > 0 ? (
                          <span
                            aria-hidden="true"
                            className="text-muted-foreground"
                          >
                            •
                          </span>
                        ) : null}

                        {/* Author info */}
                        <div className="flex items-center gap-1.5">
                          {author.image ? (
                            <img
                              src={author.image}
                              alt={author.name}
                              className="size-5 rounded-full object-cover"
                            />
                          ) : null}
                          <span className="text-foreground font-medium">
                            {author.name}
                          </span>

                          {/* Social links */}
                          {parsedSocials.length > 0 ? (
                            <div className="flex items-center gap-0.5 ml-0.5">
                              {parsedSocials.map((social, socialIndex) => (
                                <Button
                                  key={socialIndex}
                                  asChild
                                  variant="ghost"
                                  mode="icon"
                                  size="xs"
                                  className="size-5 p-0"
                                >
                                  <Link
                                    to={social.url}
                                    aria-label={`${author.name} on ${social.displayName}`}
                                  >
                                    {getSocialIcon(social.platform)}
                                  </Link>
                                </Button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>
        </header>

        {/* Article Content */}
        {post.content ? (
          <div className="mb-12">
            <RawHtml html={post.content} />
          </div>
        ) : null}

        {/* Tags */}
        {post.tags && post.tags.length > 0 ? (
          <div className="mb-12 pb-8 border-b">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 ? (
        <aside className="max-w-4xl mx-auto mt-16 pt-12 border-t">
          <h2 className="text-2xl font-bold tracking-tight mb-6">
            Related Articles
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {relatedPosts.map((relatedPost) => (
              <article
                key={relatedPost.id}
                className="group flex flex-col border rounded-lg overflow-hidden transition-shadow hover:shadow-md"
              >
                {relatedPost.coverImage ? (
                  <RouterLink
                    to={`/blog/${relatedPost.slug}`}
                    className="aspect-video overflow-hidden bg-muted"
                  >
                    <img
                      src={relatedPost.coverImage}
                      alt={relatedPost.title}
                      className="w-full h-full object-cover"
                    />
                  </RouterLink>
                ) : null}

                <div className="flex flex-col flex-1 p-4">
                  {/* Post Meta */}
                  {relatedPost.publishedAt ? (
                    <time
                      dateTime={relatedPost.publishedAt.toISOString()}
                      className="text-xs text-muted-foreground mb-2"
                    >
                      {format(relatedPost.publishedAt, "MMM d, yyyy")}
                    </time>
                  ) : null}

                  {/* Title */}
                  <h3 className="text-base font-semibold tracking-tight mb-2">
                    <RouterLink to={`/blog/${relatedPost.slug}`}>
                      {relatedPost.title}
                    </RouterLink>
                  </h3>

                  {/* Description */}
                  {relatedPost.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {relatedPost.description}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

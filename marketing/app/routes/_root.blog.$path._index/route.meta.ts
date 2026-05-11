import { MetadataComposer } from "~/lib/meta";
import { extractYouTubeId } from "~/lib/utils";

import type { Route } from "./+types/route";

export function meta({ data }: Route.MetaArgs) {
  if (!data?.post) {
    return [{ title: "Post not found" }];
  }

  const { post } = data;
  const postUrl = `https://www.postforme.dev/blog/${post.slug}`;

  const metadata = new MetadataComposer();
  metadata.title = `${post.title} - Post For Me Blog`;
  metadata.description = post.description || post.title;
  metadata.canonical = postUrl;
  metadata.contentType = "article";
  metadata.publishedTime = post.publishedAt.toISOString();
  metadata.modifiedTime = post.updatedAt.toISOString();

  // Add featured image if available
  if (post.coverImage) {
    metadata.image = post.coverImage;
  }

  // Add author if available (use primary author for metadata)
  if (post.authors.length > 0) {
    metadata.author = post.authors[0].name;
  }

  // Article Schema
  const articleSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description || post.title,
    url: postUrl,
    datePublished: post.publishedAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author:
      post.authors.length > 0
        ? post.authors.length === 1
          ? {
              "@type": "Person",
              name: post.authors[0].name,
              ...(post.authors[0].image && { image: post.authors[0].image }),
              ...(post.authors[0].bio && { description: post.authors[0].bio }),
              ...(post.authors[0].socials.length > 0 && {
                sameAs: post.authors[0].socials.map((s) => s.url),
              }),
            }
          : post.authors.map((author) => ({
              "@type": "Person",
              name: author.name,
              ...(author.image && { image: author.image }),
              ...(author.bio && { description: author.bio }),
              ...(author.socials.length > 0 && {
                sameAs: author.socials.map((s) => s.url),
              }),
            }))
        : {
            "@type": "Organization",
            name: "Post For Me",
            url: "https://www.postforme.dev",
          },
    publisher: {
      "@type": "Organization",
      name: "Post For Me",
      url: "https://www.postforme.dev",
      logo: {
        "@type": "ImageObject",
        url: "https://www.postforme.dev/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
  };

  // Add featured image to article schema
  if (post.coverImage) {
    articleSchema.image = {
      "@type": "ImageObject",
      url: post.coverImage,
    };
  }

  metadata.addSchema(articleSchema);

  // Breadcrumb Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.postforme.dev",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: "https://www.postforme.dev/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: postUrl,
      },
    ],
  };

  metadata.addSchema(breadcrumbSchema);

  // Speakable Schema - mark the main content as speakable
  const speakableSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: postUrl,
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["article h1", "article .prose"],
    },
  };

  metadata.addSchema(speakableSchema);

  // Video — prefer the explicit cover_video, fall back to scanning content.
  // setVideo emits both og:video tags and the VideoObject JSON-LD.
  const coverVideoId = post.coverVideo
    ? extractYouTubeId(post.coverVideo)
    : null;
  const contentVideoId =
    !coverVideoId && post.content ? extractYouTubeId(post.content) : null;
  const videoId = coverVideoId ?? contentVideoId;

  if (videoId) {
    metadata.setVideo({
      youtubeId: videoId,
      title: post.title,
      description: post.description || post.title,
      uploadDate: post.publishedAt.toISOString(),
    });
  }

  return metadata.build();
}

import type { MetaDescriptor } from "react-router";
import type { Route } from "./+types/route";

/**
 * Simple utility to merge meta arrays.
 * Browser automatically uses the last occurrence of duplicate meta tags.
 */

/**
 * Meta function for individual post pages.
 * Returns post-specific SEO including rich article structured data.
 * Merges with all parent route meta at the lowest level.
 */
export const meta: Route.MetaFunction = ({
  data,
  matches,
}): MetaDescriptor[] => {
  console.log("RESOURCE");
  console.log(matches);

  if (!data) return [];

  const seo = data.seo_meta ?? {};
  const siteUrl = data.siteUrl || "https://postfor.me";
  const siteName = data.siteName || "Post For Me";

  // Post-specific meta
  const title = seo.title || data.title;
  const description = seo.description || data.summary;
  const canonical = `${siteUrl}/resources/${data.category?.slug}/${data.slug}`;
  const keywords =
    seo.keywords || data.tags?.map((tag) => tag.name).join(", ") || "";

  // Social images - prefer post cover image, fallback to default
  const imageBase = `${siteUrl}/og-image`;
  const ogImage = data.coverImage || `${imageBase}-16x9.png`;

  // Article structured data
  const articleLD = {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    headline: title,
    description,
    datePublished: data.created_at,
    dateModified: data.updated_at,
    inLanguage: "en",
    image: data.coverImage ? [{ url: data.coverImage }] : [{ url: ogImage }],
    author: data.authors?.[0]
      ? {
          "@type": "Person",
          name: data.authors[0].name,
        }
      : {
          "@type": "Organization",
          name: "Post For Me",
          url: siteUrl,
        },
    publisher: {
      "@type": "Organization",
      name: siteName,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.png`,
        width: 512,
        height: 512,
      },
    },
    ...(keywords && { keywords }),
    isAccessibleForFree: true,
  };

  // Collect all meta from parent routes
  const parentMeta: MetaDescriptor[] = matches
    .flatMap((match) => {
      if (match && match.meta && Array.isArray(match.meta)) {
        return match.meta;
      }
      return [];
    })
    .filter((meta): meta is MetaDescriptor => Boolean(meta));

  const postMeta: MetaDescriptor[] = [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: canonical },

    // Article-specific meta
    { property: "og:type", content: "article" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonical },
    { property: "og:image", content: ogImage },
    { property: "og:image:alt", content: `${title} - Post For Me` },
    { property: "article:published_time", content: data.created_at },
    { property: "article:modified_time", content: data.updated_at },

    // Twitter meta
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },

    // Article structured data
    { "script:ld+json": articleLD } as MetaDescriptor,
  ];

  // Add author meta if available
  if (data.authors?.[0]) {
    postMeta.push({
      property: "article:author",
      content: data.authors[0].name,
    });
  }

  // Add keywords if available
  if (keywords) {
    postMeta.push({
      name: "keywords",
      content: `${keywords}, social media API, posting API, ${data.category?.name} API`,
    });
  }

  // Simply concatenate parent and post meta - browser uses last occurrence of duplicates
  const finalMeta = [...parentMeta, ...postMeta];

  return finalMeta;
};

// import { buildHowToSchema } from "~/lib/.server/schema/build-how-to-schema";

import type { MetaFunction, MetaDescriptor } from "react-router";
import type { loader } from "./route";

/**
 * SEO & social-meta builder for Resource pages.
 * Keeps titles/descriptions within Google-friendly limits,
 * provides rich JSON-LD, and returns a MetaDescriptor[] for Remix.
 */
export const meta: MetaFunction<typeof loader> = ({
  data,
}): MetaDescriptor[] => {
  if (!data) return [];

  const seo = data.seo_meta ?? {};

  /* ---------- Title & Description (length-safe) ---------- */
  const rawTitle = seo.title ?? data.title;
  const title = rawTitle.length > 60 ? `${rawTitle.slice(0, 57)}…` : rawTitle;

  const rawDesc = seo.description ?? data.summary ?? "";
  const description =
    rawDesc.length > 155 ? `${rawDesc.slice(0, 152)}…` : rawDesc;

  /* ---------- Canonical URL ---------- */
  const canonical = `${data.siteUrl}/resources/${data.slug}`;

  /* ---------- Primary keywords (for on-page use, not meta tag) ---------- */
  const primaryKeywords = [
    "social media API",
    "posting API",
    "scheduling API",
    "developer social API",
    "TikTok API",
    "Instagram API",
    "Facebook API",
    "X API",
    "LinkedIn API",
  ].join(", ");

  /* ---------- Social-share image variants ---------- */
  const imageBase = `${data.siteUrl}/og-image`;
  const images = [
    { url: `${imageBase}-16x9.png` }, // 1200×630
    { url: `${imageBase}-4x3.png` }, // 1200×900
    { url: `${imageBase}-1x1.png` }, // 1200×1200
  ];

  /* ---------- Dates ---------- */
  const publishedISO = data.created_at;
  const modifiedISO = data.updated_at;

  /* ---------- JSON-LD: Article (rich results eligible) ---------- */
  const articleLD = {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    headline: title,
    description,
    datePublished: publishedISO,
    dateModified: modifiedISO,
    inLanguage: "en",
    image: images, // multiple aspect ratios
    author: {
      "@type": "Organization",
      name: "Day Moon Development",
      url: "https://www.daymoon.dev",
      sameAs: [
        "https://github.com/daymoondev",
        "https://twitter.com/daymoondev",
      ],
    },
    publisher: {
      "@type": "Organization",
      name: data.siteName,
      logo: {
        "@type": "ImageObject",
        url: "https://www.daymoon.dev/assets/day-moon-logo.png",
        width: 512,
        height: 512,
      },
    },
    keywords: primaryKeywords,
    isAccessibleForFree: true,
  };

  /* ---------- JSON-LD: Breadcrumbs ---------- */
  const breadcrumbsLD = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Resources",
        item: `${data.siteUrl}/resources`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
        item: canonical,
      },
    ],
  };

  /* ---------- (Optional) JSON-LD: HowTo ---------- */
  // if (data.howToSteps?.length) {
  //   const howToLD = { ...buildHowTo(data) };
  //   tags.push({ "script:ld+json": howToLD });
  // }

  /* ---------- MetaDescriptor list ---------- */
  const tags: MetaDescriptor[] = [
    /* Core */
    { title },
    { name: "description", content: description },

    /* Canonical & hreflang */
    { tagName: "link", rel: "canonical", href: canonical },
    {
      tagName: "link",
      rel: "alternate",
      hrefLang: "x-default",
      href: canonical,
    },

    /* Robots */
    { name: "robots", content: "index, follow, max-image-preview:large" },
    {
      name: "googlebot",
      content: "index, follow, max-image-preview:large, max-video-preview:-1",
    },
    { name: "bingbot", content: "index, follow" },

    /* Open Graph */
    { property: "og:type", content: "article" },
    { property: "og:site_name", content: data.siteName },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonical },
    { property: "og:image", content: images[0].url },
    { property: "og:image:alt", content: `Illustration – ${title}` },
    { property: "og:locale", content: "en_US" },
    { property: "article:published_time", content: publishedISO },
    { property: "article:modified_time", content: modifiedISO },
    { property: "article:author", content: "Day Moon Development" },

    /* Twitter */
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: images[0].url },
    { name: "twitter:site", content: "@daymoondev" },

    /* JSON-LD blobs */
    { "script:ld+json": articleLD },
    { "script:ld+json": breadcrumbsLD },
  ];

  return tags.filter(Boolean) as MetaDescriptor[];
};

const SITE_URL = "https://ui.postforme.dev";

// SEO for the branded home. Fixed PFM copy (not localized yet — the i18n picker
// comes later); mirrors the marketing site's meta shape.
export function meta() {
  const title = "Post for Me — Component Registry";
  const description =
    "Copy-paste React components for building social posting UIs — install them into your app with the shadcn CLI.";
  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: SITE_URL },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: SITE_URL },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
}

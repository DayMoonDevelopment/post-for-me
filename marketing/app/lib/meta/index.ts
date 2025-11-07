import type { MetaDescriptor } from "react-router";
import {
  generateBreadcrumbStructuredData,
  type BreadcrumbItem,
} from "~/lib/utils";

export class MetadataComposer {
  private explicitMeta: MetaDescriptor[] = [];
  private _siteUrl: string = "https://postfor.me";
  private _siteName: string = "Post For Me";
  private _title?: string;
  private _description?: string;
  private _canonical?: string;
  private _keywords?: string;
  private _image?: string;
  private _contentType: "website" | "article" = "website";
  private _publishedTime?: string;
  private _modifiedTime?: string;
  private _author?: string;
  private _locale: string = "en_US";
  private _imageWidth: number = 1200;
  private _imageHeight: number = 630;

  constructor() {
    // Add base site metadata on construction
    this.explicitMeta.push(
      { property: "og:site_name", content: this._siteName },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@postforme" },
      { name: "theme-color", content: "#000000" },
      { tagName: "link", rel: "icon", href: "/favicon.ico" },
    );
  }

  /**
   * Set the page title
   */
  set title(value: string) {
    this._title = value;
  }

  get title(): string | undefined {
    return this._title;
  }

  /**
   * Set the page description
   */
  set description(value: string) {
    this._description = value;
  }

  get description(): string | undefined {
    return this._description;
  }

  /**
   * Set the canonical URL
   */
  set canonical(value: string) {
    this._canonical = value;
  }

  get canonical(): string | undefined {
    return this._canonical;
  }

  /**
   * Set keywords
   */
  set keywords(value: string) {
    this._keywords = value;
  }

  get keywords(): string | undefined {
    return this._keywords;
  }

  /**
   * Set the cover/social image
   */
  set image(value: string) {
    this._image = value;
  }

  get image(): string | undefined {
    return this._image;
  }

  /**
   * Set content type (website or article)
   */
  set contentType(value: "website" | "article") {
    this._contentType = value;
  }

  get contentType(): "website" | "article" {
    return this._contentType;
  }

  /**
   * Set published time (for articles)
   */
  set publishedTime(value: string) {
    this._publishedTime = value;
  }

  get publishedTime(): string | undefined {
    return this._publishedTime;
  }

  /**
   * Set modified time (for articles)
   */
  set modifiedTime(value: string) {
    this._modifiedTime = value;
  }

  get modifiedTime(): string | undefined {
    return this._modifiedTime;
  }

  /**
   * Set author (for articles)
   */
  set author(value: string) {
    this._author = value;
  }

  get author(): string | undefined {
    return this._author;
  }

  /**
   * Set the site URL (used for generating absolute URLs)
   */
  set siteUrl(value: string) {
    this._siteUrl = value;
  }

  get siteUrl(): string {
    return this._siteUrl;
  }

  /**
   * Set the site name
   */
  set siteName(value: string) {
    this._siteName = value;
    // Update the og:site_name that was added in constructor
    const siteNameIndex = this.explicitMeta.findIndex(
      (meta) => "property" in meta && meta.property === "og:site_name",
    );
    if (siteNameIndex !== -1) {
      this.explicitMeta[siteNameIndex] = {
        property: "og:site_name",
        content: value,
      };
    }
  }

  get siteName(): string {
    return this._siteName;
  }

  /**
   * Set the locale (for og:locale)
   */
  set locale(value: string) {
    this._locale = value;
  }

  get locale(): string {
    return this._locale;
  }

  /**
   * Set image width (used for both OG and Twitter)
   */
  set imageWidth(value: number) {
    this._imageWidth = value;
  }

  get imageWidth(): number {
    return this._imageWidth;
  }

  /**
   * Set image height (used for both OG and Twitter)
   */
  set imageHeight(value: number) {
    this._imageHeight = value;
  }

  get imageHeight(): number {
    return this._imageHeight;
  }

  /**
   * Set breadcrumb structured data
   */
  setBreadcrumbs(breadcrumbs?: BreadcrumbItem[]): this {
    const breadcrumbStructuredData = generateBreadcrumbStructuredData(
      breadcrumbs || [{ title: "Resources", href: "/resources" }],
      this._siteUrl,
    );
    this.explicitMeta.push({
      "script:ld+json": breadcrumbStructuredData,
    } as MetaDescriptor);
    return this;
  }

  /**
   * Add custom schema.org structured data
   */
  addSchema(schemaData: Record<string, unknown>): this {
    this.explicitMeta.push({ "script:ld+json": schemaData } as MetaDescriptor);
    return this;
  }

  /**
   * Generate automatic metadata based on shared properties
   */
  private generateAutoMetadata(): MetaDescriptor[] {
    const autoMeta: MetaDescriptor[] = [];

    // Core metadata
    if (this._title) {
      autoMeta.push({ title: this._title });
    }

    if (this._description) {
      autoMeta.push({ name: "description", content: this._description });
    }

    if (this._canonical) {
      autoMeta.push({
        tagName: "link",
        rel: "canonical",
        href: this._canonical,
      });
    }

    if (this._keywords) {
      autoMeta.push({ name: "keywords", content: this._keywords });
    }

    // Open Graph metadata (generated automatically)
    if (this._title && this._description && this._canonical) {
      const ogImage = this._image || `${this._siteUrl}/og-image-16x9.png`;

      autoMeta.push(
        { property: "og:type", content: this._contentType },
        { property: "og:title", content: this._title },
        { property: "og:description", content: this._description },
        { property: "og:url", content: this._canonical },
        { property: "og:image", content: ogImage },
        {
          property: "og:image:alt",
          content: this._title,
        },
        { property: "og:image:width", content: this._imageWidth.toString() },
        { property: "og:image:height", content: this._imageHeight.toString() },
      );

      autoMeta.push({ property: "og:locale", content: this._locale });
    }

    // Twitter metadata (generated automatically)
    if (this._title && this._description) {
      const twitterImage = this._image || `${this._siteUrl}/og-image-16x9.png`;

      autoMeta.push(
        { name: "twitter:title", content: this._title },
        { name: "twitter:description", content: this._description },
        { name: "twitter:image", content: twitterImage },
        { name: "twitter:image:width", content: this._imageWidth.toString() },
        { name: "twitter:image:height", content: this._imageHeight.toString() },
      );
    }

    // Article-specific metadata
    if (this._contentType === "article") {
      if (this._publishedTime) {
        autoMeta.push({
          property: "article:published_time",
          content: this._publishedTime,
        });
      }
      if (this._modifiedTime) {
        autoMeta.push({
          property: "article:modified_time",
          content: this._modifiedTime,
        });
      }
      if (this._author) {
        autoMeta.push({ property: "article:author", content: this._author });
      }
    }

    return autoMeta;
  }

  /**
   * Generate automatic schema.org structured data based on content type and properties
   */
  private generateAutoSchema(): MetaDescriptor[] {
    const schemas: MetaDescriptor[] = [];

    // Auto-generate article schema for articles
    if (
      this._contentType === "article" &&
      this._title &&
      this._description &&
      this._canonical
    ) {
      const articleSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        mainEntityOfPage: { "@type": "WebPage", "@id": this._canonical },
        headline: this._title,
        description: this._description,
        datePublished: this._publishedTime,
        dateModified: this._modifiedTime,
        inLanguage: "en",
        image: this._image
          ? [{ url: this._image }]
          : [{ url: `${this._siteUrl}/og-image-16x9.png` }],
        author: this._author
          ? {
              "@type": "Person",
              name: this._author,
            }
          : {
              "@type": "Organization",
              name: this._siteName,
              url: this._siteUrl,
            },
        publisher: {
          "@type": "Organization",
          name: this._siteName,
          logo: {
            "@type": "ImageObject",
            url: `${this._siteUrl}/logo.png`,
            width: 512,
            height: 512,
          },
        },
        ...(this._keywords && { keywords: this._keywords }),
        isAccessibleForFree: true,
      };

      schemas.push({ "script:ld+json": articleSchema } as MetaDescriptor);
    }

    return schemas;
  }

  /**
   * Create CollectionPage schema for listing pages
   */
  createCollectionPageSchema(config: {
    title: string;
    description: string;
    canonical: string;
    dateModified?: string;
    datePublished?: string;
    about?: Record<string, unknown>;
    hasPart?: Array<{
      "@type": string;
      name: string;
      description?: string;
      url: string;
      datePublished?: string;
      image?: string;
    }>;
    totalItems?: number;
    itemListElements?: Array<{
      name: string;
      description?: string;
      url: string;
      datePublished?: string;
    }>;
  }): Record<string, unknown> {
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: config.title,
      description: config.description,
      url: config.canonical,
      ...(config.dateModified && { dateModified: config.dateModified }),
      ...(config.datePublished && { datePublished: config.datePublished }),
      ...(config.about && { about: config.about }),
      ...(config.hasPart && { hasPart: config.hasPart }),
      inLanguage: "en",
      isPartOf: {
        "@type": "WebSite",
        name: this._siteName,
        url: this._siteUrl,
        sameAs: [
          "https://twitter.com/postforme",
          "https://github.com/postforme",
          "https://linkedin.com/company/postforme",
          "https://discord.gg/postforme",
        ],
      },
      ...(config.totalItems && { numberOfItems: config.totalItems }),
    };
  }

  /**
   * Create ItemList schema for structured list content
   */
  createItemListSchema(config: {
    title: string;
    description: string;
    items: Array<{
      name: string;
      description?: string;
      url: string;
      datePublished?: string;
      image?: string;
    }>;
  }): Record<string, unknown> {
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: config.title,
      description: config.description,
      numberOfItems: config.items.length,
      itemListElement: config.items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Article",
          name: item.name,
          description: item.description,
          url: item.url,
          ...(item.datePublished && { datePublished: item.datePublished }),
          ...(item.image && { image: item.image }),
        },
      })),
    };
  }

  /**
   * Create FAQ schema for frequently asked questions
   */
  createFAQSchema(config: {
    questions: Array<{
      question: string;
      answer: string;
    }>;
    id?: string;
  }): Record<string, unknown> {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": config.id || `${this._siteUrl}#faq`,
      mainEntity: config.questions.map((qa) => ({
        "@type": "Question",
        name: qa.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: qa.answer,
        },
      })),
    };
  }

  /**
   * Build and return the complete metadata array
   */
  build(): MetaDescriptor[] {
    const autoMeta = this.generateAutoMetadata();
    const autoSchemas = this.generateAutoSchema();

    return [...this.explicitMeta, ...autoMeta, ...autoSchemas];
  }
}

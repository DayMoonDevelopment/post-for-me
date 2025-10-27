import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import uniqBy from "lodash/uniqBy"
import type { MetaDescriptor } from "react-router"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Breadcrumb item interface
 */
export interface BreadcrumbItem {
  title: string;
  href: string | null;
}

/**
 * Generate breadcrumb structured data for SEO
 */
export function generateBreadcrumbStructuredData(
  breadcrumbs: BreadcrumbItem[],
  siteUrl: string = "https://postfor.me"
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${siteUrl}/breadcrumbs`,
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "@id": crumb.href ? `${siteUrl}${crumb.href}#breadcrumb` : `${siteUrl}#breadcrumb-${index + 1}`,
      "position": index + 1,
      "name": crumb.title,
      ...(crumb.href && { "item": `${siteUrl}${crumb.href}` })
    }))
  };
}

/**
 * Build breadcrumbs for resources routes
 */
export function buildResourcesBreadcrumbs(
  categoryName?: string,
  categorySlug?: string,
  postTitle?: string
): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Resources", href: "/resources" }
  ];

  if (categoryName && categorySlug) {
    breadcrumbs.push({
      title: categoryName,
      href: `/resources/${categorySlug}`
    });
  }

  if (postTitle) {
    breadcrumbs.push({
      title: postTitle,
      href: null // Current page
    });
  }

  return breadcrumbs;
}

/**
 * Deep merge meta arrays with priority given to higher index elements.
 * Removes duplicates based on title, property, and name keys.
 * When duplicates are found, the element with the higher index takes priority.
 */
export function mergeMetaArrays(...metaArrays: MetaDescriptor[][]): MetaDescriptor[] {
  // Flatten all meta arrays into a single array with original indices
  const allMeta = metaArrays.flatMap((metaArray, arrayIndex) =>
    metaArray.map((meta, itemIndex) => ({
      ...meta,
      _originalIndex: arrayIndex * 1000 + itemIndex // Create unique index for priority
    }))
  );

  // Create a function to generate a unique key for each meta descriptor
  const getMetaKey = (meta: MetaDescriptor & { _originalIndex?: number }) => {
    // Check for different types of meta descriptors and create unique keys
    if ('title' in meta && meta.title) return `title:${meta.title}`;
    if ('property' in meta && meta.property) return `property:${meta.property}`;
    if ('name' in meta && meta.name) return `name:${meta.name}`;
    if ('tagName' in meta && meta.tagName) {
      // Handle link tags with rel attribute
      if (meta.tagName === 'link' && 'rel' in meta) {
        return `link:${meta.rel}`;
      }
      return `tagName:${meta.tagName}`;
    }
    if ('script:ld+json' in meta) return 'script:ld+json';

    // Fallback to a combination of available properties
    const keyParts = [];
    if ('content' in meta) keyParts.push(`content:${meta.content}`);
    if ('href' in meta) keyParts.push(`href:${meta.href}`);

    return keyParts.length > 0 ? keyParts.join('|') : `index:${meta._originalIndex}`;
  };

  // Use lodash uniqBy to remove duplicates, keeping the last occurrence (highest index)
  // We reverse first so uniqBy keeps the last occurrence, then reverse back
  const uniqueMeta = uniqBy(allMeta.reverse(), getMetaKey).reverse();

  // Remove the temporary _originalIndex property
  return uniqueMeta.map(({ _originalIndex, ...meta }) => meta);
}

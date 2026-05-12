# FAQ Data Structure

## Overview

All FAQ data is now consolidated into a single source of truth at `app/lib/.server/data/faq.ts`. This structure allows for:

1. **Centralized Management**: All FAQs in one place
2. **Category Organization**: FAQs organized by category for the `/faq` page
3. **Route-Specific Display**: Individual FAQs tagged for specific routes

## Data Structure

### FAQCategory Enum

Located in `app/lib/global.types.ts`:

```typescript
export enum FAQCategory {
  General = "general",
  Pricing = "pricing",
  Security = "security",
  Integration = "integration",
  Media = "media",
  Account = "account",
  Support = "support",
  Technical = "technical",
  Troubleshooting = "troubleshooting",
}
```

### FAQItem Type

```typescript
export type FAQItem = {
  id: string; // Unique identifier
  category?: FAQCategory; // Optional category from enum
  question: string; // The question text
  answer: string; // The answer (supports markdown)
  routes: string[]; // Array of route IDs where this FAQ appears
};
```

**Note:** The `category` field is optional. FAQs without a category will:
- **NOT** appear in the visual display on the `/faq` page
- **WILL** still be included in the page metadata/SEO for the `/faq` page
- Can still be displayed on other routes via the `routes` array

## Route IDs

Routes use the following IDs for the `routes` array:

- `"home"` - Homepage (`/_root._index`)
- `"solutions.social-media-scheduler"` - Social Media Scheduler solution page
- `"solutions.ai-content-generation"` - AI Content Generation solution page
- `"solutions.multi-account-management"` - Multi-Account Management solution page
- `"solutions.games"` - Games solution page
- `"solutions.saas-products"` - SaaS Products solution page
- `"solutions.e-commerce-platforms"` - E-commerce Platforms solution page
- `"solutions.influencer-management"` - Influencer Management solution page
- `"solutions.crm-systems"` - CRM Systems solution page
- `"solutions.dam-tools"` - DAM Tools solution page
- `"solutions.news-media-publishers"` - News Media Publishers solution page
- `"solutions.event-management"` - Event Management solution page

## Helper Functions

### `getFAQsByCategory()`

Returns all FAQs organized by category for the `/faq` page. **Only includes FAQs with a category assigned.**

```typescript
const faqsByCategory = getFAQsByCategory();
// Returns: Array<{ category: FAQCategory, items: FAQItem[] }>
```

### `getFAQsForRoute(routeId: string)`

Returns FAQs for a specific route:

```typescript
const homeFAQs = getFAQsForRoute("home");
// Returns: FAQItem[]
```

### `getAllFAQs()`

Returns all FAQs (including those with and without categories):

```typescript
const allFAQs = getAllFAQs();
// Returns: FAQItem[]
```

### `getAllFAQsWithoutCategory()`

Returns only FAQs that don't have a category assigned:

```typescript
const uncategorizedFAQs = getAllFAQsWithoutCategory();
// Returns: FAQItem[]
```

### `getCategoryDisplayName(category: FAQCategory)`

Returns the display name for a category:

```typescript
const name = getCategoryDisplayName(FAQCategory.General);
// Returns: "General Questions"
```

## Adding New FAQs

To add a new FAQ:

1. Open `app/lib/.server/data/faq.ts`
2. Add a new item to the `faqItems` array:

```typescript
{
  id: "unique-id-here",
  category: FAQCategory.General,
  question: "Your question here?",
  answer: "Your answer here. Supports markdown like [links](https://example.com).",
  routes: ["home", "solutions.social-media-scheduler"], // Add route IDs where this should appear
}
```

## Usage in Routes

### Homepage (`/_root._index`)

Loader fetches FAQs with route ID `"home"`:

```typescript
const faq = getFAQsForRoute("home");
```

### FAQ Page (`/_root.faq._index`)

Loader fetches:
- Categorized FAQs for visual display (excludes FAQs without categories)
- All FAQs for metadata/SEO (includes FAQs with and without categories)

```typescript
const faqsByCategory = getFAQsByCategory(); // For visual display
const allFAQs = getAllFAQs(); // For metadata
```

### Solutions Pages (`/_root.solutions.$id._index`)

Loader fetches FAQs based on the solution ID:

```typescript
const faqs = getFAQsForRoute(`solutions.${id}`); // id is the solution route parameter
```

## SEO and Structured Data

### Google's No-Duplicate Policy

To comply with Google's policy against duplicate FAQ structured data, the FAQ schema (`@type: "FAQPage"`) is **ONLY** included on the main `/faq` page (`_root.faq._index/route.meta.ts`).

All other pages (homepage, solutions pages, developers page, etc.) **DO NOT** include FAQ structured data in their metadata, even if they display FAQ content visually.

This ensures:
- No duplicate structured data across pages
- Better SEO performance
- Compliance with Google's guidelines

### Routes Without FAQ Schema

The following routes have had FAQ schema removed:
- `/_root._index` (Homepage)
- `/_root.solutions.$id._index` (Solutions pages)
- `/_root.developers._index` (Developers page)
- `/_root.contact._index` (Contact page)

## Benefits

1. **Single Source of Truth**: All FAQ data in one file
2. **Type Safety**: Strongly typed categories and structure
3. **Flexibility**: Easy to add FAQs to multiple routes
4. **Maintainability**: Easy to update FAQ content across all pages
5. **Markdown Support**: Answers support markdown for links and formatting
6. **SEO Compliant**: Follows Google's no-duplicate structured data policy
7. **Optional Categories**: FAQs can be route-specific without appearing on the main FAQ page

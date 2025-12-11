export const STRIPE_SECRET_KEY = process.env?.STRIPE_SECRET_KEY || "";
export const STRIPE_WEBHOOK_SECRET = process.env?.STRIPE_WEBHOOK_SECRET || "";
export const STRIPE_API_PRODUCT_ID = process.env?.STRIPE_API_PRODUCT_ID || "";
export const STRIPE_CREDS_ADDON_PRODUCT_ID =
  process.env?.STRIPE_CREDS_ADDON_PRODUCT_ID || "";
export const STRIPE_METER_EVENT_ID = process.env?.STRIPE_METER_EVENT_ID || "";

// New pricing model product IDs
export const STRIPE_PRICING_TIER_1K_PRODUCT_ID =
  process.env?.STRIPE_PRICING_TIER_1K_PRODUCT_ID || "";
export const STRIPE_PRICING_TIER_2_5K_PRODUCT_ID =
  process.env?.STRIPE_PRICING_TIER_2_5K_PRODUCT_ID || "";
export const STRIPE_PRICING_TIER_5K_PRODUCT_ID =
  process.env?.STRIPE_PRICING_TIER_5K_PRODUCT_ID || "";
export const STRIPE_PRICING_TIER_10K_PRODUCT_ID =
  process.env?.STRIPE_PRICING_TIER_10K_PRODUCT_ID || "";
export const STRIPE_PRICING_TIER_20K_PRODUCT_ID =
  process.env?.STRIPE_PRICING_TIER_20K_PRODUCT_ID || "";
export const STRIPE_PRICING_TIER_40K_PRODUCT_ID =
  process.env?.STRIPE_PRICING_TIER_40K_PRODUCT_ID || "";
export const STRIPE_PRICING_TIER_100K_PRODUCT_ID =
  process.env?.STRIPE_PRICING_TIER_100K_PRODUCT_ID || "";
export const STRIPE_PRICING_TIER_200K_PRODUCT_ID =
  process.env?.STRIPE_PRICING_TIER_200K_PRODUCT_ID || "";

// Array of all new pricing tier product IDs for easy checking
export const NEW_PRICING_TIER_PRODUCT_IDS = [
  STRIPE_PRICING_TIER_1K_PRODUCT_ID,
  STRIPE_PRICING_TIER_2_5K_PRODUCT_ID,
  STRIPE_PRICING_TIER_5K_PRODUCT_ID,
  STRIPE_PRICING_TIER_10K_PRODUCT_ID,
  STRIPE_PRICING_TIER_20K_PRODUCT_ID,
  STRIPE_PRICING_TIER_40K_PRODUCT_ID,
  STRIPE_PRICING_TIER_100K_PRODUCT_ID,
  STRIPE_PRICING_TIER_200K_PRODUCT_ID,
].filter(Boolean); // Filter out empty strings

// Pricing tier configuration
export const PRICING_TIERS = [
  {
    productId: STRIPE_PRICING_TIER_1K_PRODUCT_ID,
    name: "Pro",
    posts: 1000,
    price: 10,
  },
  {
    productId: STRIPE_PRICING_TIER_2_5K_PRODUCT_ID,
    name: "Pro",
    posts: 2500,
    price: 25,
  },
  {
    productId: STRIPE_PRICING_TIER_5K_PRODUCT_ID,
    name: "Pro",
    posts: 5000,
    price: 50,
  },
  {
    productId: STRIPE_PRICING_TIER_10K_PRODUCT_ID,
    name: "Pro",
    posts: 10000,
    price: 75,
  },
  {
    productId: STRIPE_PRICING_TIER_20K_PRODUCT_ID,
    name: "Pro",
    posts: 20000,
    price: 150,
  },
  {
    productId: STRIPE_PRICING_TIER_40K_PRODUCT_ID,
    name: "Pro",
    posts: 40000,
    price: 300,
  },
  {
    productId: STRIPE_PRICING_TIER_100K_PRODUCT_ID,
    name: "Pro",
    posts: 100000,
    price: 500,
  },
  {
    productId: STRIPE_PRICING_TIER_200K_PRODUCT_ID,
    name: "Pro",
    posts: 200000,
    price: 1000,
  },
].filter((tier) => tier.productId); // Filter out tiers without product IDs

if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.trim() === "") {
  throw new Error("STRIPE_SECRET_KEY is not defined");
}

if (!STRIPE_API_PRODUCT_ID || STRIPE_API_PRODUCT_ID.trim() === "") {
  throw new Error("STRIPE_API_PRODUCT_ID is not defined");
}

// we only need to validate the webhook key in production
const webhookKeyInvalid =
  !STRIPE_WEBHOOK_SECRET || STRIPE_WEBHOOK_SECRET.trim() === "";
if (process.env.mode === "production" && webhookKeyInvalid) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not defined");
}

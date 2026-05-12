export type FAQType = {
  q: string;
  a: string;
};

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

export type FAQItem = {
  id: string;
  category?: FAQCategory;
  question: string;
  answer: string;
  routes: string[];
};

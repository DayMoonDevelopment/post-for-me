// Realistic dummy content for the preview demos — real photos, video thumbnails, and
// fake user profiles — so previews read like actual posts. Photos come from the Unsplash
// CDN (stable, real imagery); avatars from pravatar. Swap the provider here in one place.

/** A stable Unsplash photo by id, sized + cropped for a preview. */
const unsplash = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/** A fake avatar by pravatar index (1–70). */
const avatar = (index: number) => `https://i.pravatar.cc/160?img=${index}`;

export type SampleUser = {
  name: string;
  handle: string;
  avatarUrl: string;
};

// Fun parodies of well-known tech execs — clearly not the real thing, just playful
// references so the previews feel alive.
export const SAMPLE_USERS: SampleUser[] = [
  { name: "John Apple", handle: "johnapple", avatarUrl: avatar(12) }, // John Ternus, Apple
  { name: "Elon Must", handle: "elonmust", avatarUrl: avatar(13) }, // Elon Musk
  { name: "Mark Faceberg", handle: "faceberg", avatarUrl: avatar(53) }, // Zuckerberg
  { name: "Sundar Pixel", handle: "sundarpixel", avatarUrl: avatar(51) }, // Sundar Pichai
  { name: "Satya Nutella", handle: "nutella", avatarUrl: avatar(33) }, // Satya Nadella
  { name: "Jeff Bezless", handle: "bezless", avatarUrl: avatar(59) }, // Jeff Bezos
];

/** Look up a sample user by handle (falls back to the first). */
export function sampleUser(handle: string): SampleUser {
  return SAMPLE_USERS.find((user) => user.handle === handle) ?? SAMPLE_USERS[0]!;
}

/** A well-known set of real landscape photos. */
export const SAMPLE_PHOTOS: string[] = [
  unsplash("1506744038136-46273834b3fb"), // green valley
  unsplash("1441974231531-c6227db76b6e"), // forest path
  unsplash("1470071459604-3b5ec3a7fe05"), // foggy mountains
  unsplash("1500530855697-b586d89ba3ee"), // aerial forest
  unsplash("1501785888041-af3ef285b470"), // mountain lake
  unsplash("1519681393784-d120267933ba"), // snowy peak at night
];

/** Landscape stills that read as video thumbnails. */
export const SAMPLE_VIDEO_THUMBS: string[] = [
  unsplash("1526374965328-7f61d4dc18c5"), // code / matrix
  unsplash("1498050108023-c5249f4df085"), // laptop code
];

/** A stable Unsplash photo cropped to a portrait frame — for vertical surfaces. */
const unsplashPortrait = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=640&h=1138&q=80`;

/** A stable Unsplash photo cropped to a 16:9 landscape frame — for YouTube watch, etc. */
const unsplashLandscape = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1280&h=720&q=80`;

/** Guaranteed-landscape stills — a 16:9 crop so orientation-sniffing reads "landscape". */
export const SAMPLE_LANDSCAPE_PHOTOS: string[] = [
  unsplashLandscape("1506744038136-46273834b3fb"), // green valley
  unsplashLandscape("1500530855697-b586d89ba3ee"), // aerial forest
];

/**
 * Portrait (9:16-ish) crops for the vertical surfaces — reels, shorts, stories, TikTok.
 * The genuine portrait dimensions also let ratio-sniffing chromes (YouTube) detect a Short.
 */
export const SAMPLE_VERTICAL_PHOTOS: string[] = [
  unsplashPortrait("1441974231531-c6227db76b6e"), // forest path
  unsplashPortrait("1519681393784-d120267933ba"), // snowy peak at night
  unsplashPortrait("1470071459604-3b5ec3a7fe05"), // foggy mountains
];

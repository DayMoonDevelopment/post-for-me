const REPO = "DayMoonDevelopment/post-for-me";
const CACHE_TTL_MS = 5 * 60 * 1000;
const FALLBACK_STARS = 100;

type CacheEntry = { stars: number; fetchedAt: number };

let cache: CacheEntry | null = null;
let inflight: Promise<number> | null = null;

async function fetchStars(): Promise<number> {
  const res = await fetch(`https://api.github.com/repos/${REPO}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "post-for-me-marketing",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub responded ${res.status}`);
  }

  const data = (await res.json()) as { stargazers_count?: number };
  return typeof data.stargazers_count === "number"
    ? data.stargazers_count
    : FALLBACK_STARS;
}

export async function getGitHubStars(): Promise<number> {
  const now = Date.now();

  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.stars;
  }

  if (inflight) {
    return inflight;
  }

  inflight = fetchStars()
    .then((stars) => {
      cache = { stars, fetchedAt: now };
      return stars;
    })
    .catch(() => {
      if (cache) return cache.stars;
      return FALLBACK_STARS;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

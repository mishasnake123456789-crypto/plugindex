import { pluginCount } from "./db";

export const PLUGIN_SITEMAP_CHUNK = 5000;
export const TAG_SITEMAP_CHUNK = 5000;

export function pluginSitemapCount(): number {
  const n = pluginCount();
  if (n <= 0) return 0;
  return Math.ceil(n / PLUGIN_SITEMAP_CHUNK);
}

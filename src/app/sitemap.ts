import type { MetadataRoute } from "next";
import { absoluteUrl, queryPlugins } from "@/lib/wordpress";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/plugins",
    "/recently-updated",
    "/new",
    "/about",
    "/how-search-works",
  ].map((path) => ({
    url: absoluteUrl(path || "/"),
    changeFrequency: path === "" || path === "/plugins" ? "hourly" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const pluginRoutes: MetadataRoute.Sitemap = [];
  try {
    const [updated, newest, popular] = await Promise.all([
      queryPlugins({ browse: "updated", perPage: 50 }),
      queryPlugins({ browse: "new", perPage: 50 }),
      queryPlugins({ browse: "popular", perPage: 50 }),
    ]);
    const seen = new Set<string>();
    for (const plugin of [...updated.plugins, ...newest.plugins, ...popular.plugins]) {
      if (seen.has(plugin.slug)) continue;
      seen.add(plugin.slug);
      const lastModified = plugin.last_updated
        ? new Date(plugin.last_updated)
        : undefined;
      pluginRoutes.push({
        url: absoluteUrl(`/plugin/${plugin.slug}`),
        changeFrequency: "daily",
        priority: 0.8,
        lastModified:
          lastModified && !Number.isNaN(lastModified.getTime())
            ? lastModified
            : undefined,
      });
    }
  } catch {
    // Sitemap still ships static routes if the API is unreachable.
  }

  return [...staticRoutes, ...pluginRoutes];
}

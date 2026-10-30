import { listLocalSlugEntries, localIndexStats } from "@/lib/catalog";
import { parseWpDate } from "@/lib/seo";
import { PLUGIN_SITEMAP_CHUNK } from "@/lib/sitemaps";
import { absoluteUrl, queryPlugins } from "@/lib/wordpress";
import { urlEntry, urlset } from "@/lib/xml";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ chunk: string }>;
};

function chunkNumber(raw: string): number {
  const n = Number(String(raw).replace(/\.xml$/i, ""));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

export async function GET(_req: Request, { params }: RouteProps) {
  const { chunk } = await params;
  const page = chunkNumber(chunk);
  const offset = (page - 1) * PLUGIN_SITEMAP_CHUNK;
  const stats = localIndexStats();

  let entries: { slug: string; last_updated: string }[] = [];
  if (stats.available && stats.count > 0) {
    entries = listLocalSlugEntries(offset, PLUGIN_SITEMAP_CHUNK);
  } else if (page === 1) {
    // Bootstrap sitemap before first local sync completes
    const [updated, newest, popular] = await Promise.all([
      queryPlugins({ browse: "updated", perPage: 50 }),
      queryPlugins({ browse: "new", perPage: 50 }),
      queryPlugins({ browse: "popular", perPage: 50 }),
    ]);
    const seen = new Set<string>();
    for (const plugin of [...updated.plugins, ...newest.plugins, ...popular.plugins]) {
      if (seen.has(plugin.slug)) continue;
      seen.add(plugin.slug);
      entries.push({ slug: plugin.slug, last_updated: plugin.last_updated });
    }
  }

  const body = entries
    .map((entry) => {
      const last = parseWpDate(entry.last_updated);
      return urlEntry({
        loc: absoluteUrl(`/plugin/${entry.slug}`),
        lastmod: last ? last.toISOString() : undefined,
        changefreq: "weekly",
        priority: "0.8",
      });
    })
    .join("");

  return new Response(urlset(body), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

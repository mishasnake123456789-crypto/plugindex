import { listTopTags, localIndexStats } from "@/lib/catalog";
import { TAG_SITEMAP_CHUNK, pluginSitemapCount } from "@/lib/sitemaps";
import { absoluteUrl } from "@/lib/wordpress";
import { escapeXml, sitemapIndex } from "@/lib/xml";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const stats = localIndexStats();
  const lastmod = stats.lastSyncAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const parts: string[] = [];

  parts.push(
    `<sitemap><loc>${escapeXml(absoluteUrl("/sitemaps/static.xml"))}</loc><lastmod>${lastmod}</lastmod></sitemap>`,
  );

  const pluginMaps = Math.max(1, pluginSitemapCount());
  for (let i = 1; i <= pluginMaps; i += 1) {
    parts.push(
      `<sitemap><loc>${escapeXml(absoluteUrl(`/sitemaps/plugins/${i}.xml`))}</loc><lastmod>${lastmod}</lastmod></sitemap>`,
    );
  }

  const tags = listTopTags(500_000);
  if (tags.length > 0) {
    const tagMaps = Math.ceil(tags.length / TAG_SITEMAP_CHUNK);
    for (let i = 1; i <= tagMaps; i += 1) {
      parts.push(
        `<sitemap><loc>${escapeXml(absoluteUrl(`/sitemaps/tags/${i}.xml`))}</loc><lastmod>${lastmod}</lastmod></sitemap>`,
      );
    }
  }

  return new Response(sitemapIndex(parts.join("")), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

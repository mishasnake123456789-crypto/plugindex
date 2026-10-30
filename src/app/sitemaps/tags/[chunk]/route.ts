import { listTopTags } from "@/lib/catalog";
import { TAG_SITEMAP_CHUNK } from "@/lib/sitemaps";
import { absoluteUrl } from "@/lib/wordpress";
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
  const all = listTopTags(500_000);
  const offset = (page - 1) * TAG_SITEMAP_CHUNK;
  const slice = all.slice(offset, offset + TAG_SITEMAP_CHUNK);

  const body = slice
    .map((tag) =>
      urlEntry({
        loc: absoluteUrl(`/tag/${tag.slug}`),
        changefreq: "weekly",
        priority: "0.6",
      }),
    )
    .join("");

  return new Response(urlset(body), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

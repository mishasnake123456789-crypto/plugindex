import { absoluteUrl } from "@/lib/wordpress";
import { urlEntry, urlset } from "@/lib/xml";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATIC_PATHS: { path: string; changefreq: string; priority: string }[] = [
  { path: "/", changefreq: "hourly", priority: "1.0" },
  { path: "/plugins", changefreq: "hourly", priority: "0.9" },
  { path: "/recently-updated", changefreq: "hourly", priority: "0.8" },
  { path: "/new", changefreq: "hourly", priority: "0.8" },
  { path: "/tags", changefreq: "daily", priority: "0.7" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/how-search-works", changefreq: "monthly", priority: "0.5" },
];

export async function GET() {
  const body = STATIC_PATHS.map((item) =>
    urlEntry({
      loc: absoluteUrl(item.path),
      changefreq: item.changefreq,
      priority: item.priority,
    }),
  ).join("");

  return new Response(urlset(body), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/wordpress";
import { isValidStatsKey } from "@/lib/tracker";
import { listLocalSlugs } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Submit URLs to IndexNow (Bing and partners).
 * POST /api/indexnow?key=STATS_KEY  with optional JSON { urls?: string[], limit?: number }
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!isValidStatsKey(url.searchParams.get("key"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const indexNowKey = process.env.INDEXNOW_KEY || "wpiindexnow7f91a9957194";
  const host = absoluteUrl("/").replace(/^https?:\/\//, "").replace(/\/$/, "");
  let body: { urls?: string[]; limit?: number } = {};
  try {
    body = (await req.json()) as { urls?: string[]; limit?: number };
  } catch {
    body = {};
  }

  const limit = Math.min(Math.max(body.limit || 100, 1), 1000);
  const urls =
    body.urls && body.urls.length > 0
      ? body.urls.slice(0, limit)
      : [
          absoluteUrl("/"),
          absoluteUrl("/plugins"),
          absoluteUrl("/recently-updated"),
          absoluteUrl("/new"),
          absoluteUrl("/tags"),
          absoluteUrl("/sitemap.xml"),
          ...listLocalSlugs(0, Math.max(0, limit - 6)).map((slug) =>
            absoluteUrl(`/plugin/${slug}`),
          ),
        ];

  const payload = {
    host,
    key: indexNowKey,
    keyLocation: absoluteUrl(`/${indexNowKey}.txt`),
    urlList: urls,
  };

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  return NextResponse.json({
    ok: res.ok,
    status: res.status,
    submitted: urls.length,
    keyLocation: payload.keyLocation,
  });
}

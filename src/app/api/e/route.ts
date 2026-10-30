import { NextResponse } from "next/server";
import { recordEvent, type StatEventType } from "@/lib/stats-db";
import { clientIp, sessionId } from "@/lib/tracker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

function parseType(raw: string | null): StatEventType | null {
  if (raw === "view" || raw === "download") return raw;
  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = parseType(url.searchParams.get("t"));
  if (type) {
    const ip = clientIp(req.headers);
    const ua = req.headers.get("user-agent") || "";
    recordEvent({
      type,
      plugin: url.searchParams.get("n") || "Plugin",
      slug: url.searchParams.get("s") || "",
      category: url.searchParams.get("c") || "",
      ip,
      ua,
      session: sessionId(ip, ua),
    });
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      t?: string;
      n?: string;
      s?: string;
      c?: string;
    };
    const type = parseType(body.t || null);
    if (type) {
      const ip = clientIp(req.headers);
      const ua = req.headers.get("user-agent") || "";
      recordEvent({
        type,
        plugin: body.n || "Plugin",
        slug: body.s || "",
        category: body.c || "",
        ip,
        ua,
        session: sessionId(ip, ua),
      });
    }
  } catch {
    // ignore bad payloads
  }
  return NextResponse.json({ ok: true });
}

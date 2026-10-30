import { createHash } from "node:crypto";

export function clientIp(headers: Headers): string {
  const xf = headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "";
  return headers.get("x-real-ip") || headers.get("cf-connecting-ip") || "";
}

export function sessionId(ip: string, ua: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${day}|${ip}|${ua}`)
    .digest("hex")
    .slice(0, 24);
}

export function isValidStatsKey(key: string | null | undefined): boolean {
  const expected = process.env.STATS_KEY || "";
  if (!expected || !key) return false;
  return key === expected;
}

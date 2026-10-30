import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type PluginRow = {
  slug: string;
  name: string;
  version: string;
  author: string;
  short_description: string;
  description_html: string | null;
  rating: number;
  num_ratings: number;
  active_installs: number;
  downloaded: number;
  tested: string;
  requires: string;
  requires_php: string;
  last_updated: string;
  added: string;
  homepage: string;
  download_link: string;
  icons_json: string | null;
  banners_json: string | null;
  tags_json: string | null;
  sections_json: string | null;
  indexed_at: string;
};

const globalForDb = globalThis as unknown as {
  __plugindexDb?: DatabaseSync | null;
  __plugindexDbPath?: string;
};

function resolveDbPath(): string {
  return (
    process.env.PLUGINDEX_DB_PATH ||
    path.join(process.cwd(), "data", "plugins.sqlite")
  );
}

export function dbPath(): string {
  return resolveDbPath();
}

export function hasLocalIndex(): boolean {
  try {
    return fs.existsSync(resolveDbPath()) && fs.statSync(resolveDbPath()).size > 0;
  } catch {
    return false;
  }
}

export function getDb(): DatabaseSync | null {
  if (!hasLocalIndex()) return null;
  const file = resolveDbPath();
  if (globalForDb.__plugindexDb && globalForDb.__plugindexDbPath === file) {
    return globalForDb.__plugindexDb;
  }
  try {
    const db = new DatabaseSync(file, { readOnly: true });
    globalForDb.__plugindexDb = db;
    globalForDb.__plugindexDbPath = file;
    return db;
  } catch {
    return null;
  }
}

export function getMeta(key: string): string | null {
  const db = getDb();
  if (!db) return null;
  try {
    const row = db.prepare(`SELECT value FROM meta WHERE key = ?`).get(key) as
      | { value: string }
      | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export function pluginCount(): number {
  const fromMeta = Number(getMeta("plugin_count") || 0);
  if (fromMeta > 0) return fromMeta;
  const db = getDb();
  if (!db) return 0;
  try {
    const row = db.prepare(`SELECT COUNT(*) AS n FROM plugins`).get() as { n: number };
    return row.n;
  } catch {
    return 0;
  }
}

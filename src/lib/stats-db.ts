import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type StatEventType = "view" | "download";

export type StatEvent = {
  id: number;
  ts: string;
  type: StatEventType;
  plugin: string;
  slug: string;
  category: string;
  ip: string;
  ua: string;
  session: string;
};

export type DayRow = { day: string; views: number; downloads: number };
export type PluginRow = {
  plugin: string;
  views: number;
  downloads: number;
};

const globalForStats = globalThis as unknown as {
  __plugindexStatsDb?: DatabaseSync;
};

function resolveStatsPath(): string {
  return (
    process.env.PLUGINDEX_STATS_DB_PATH ||
    path.join(process.cwd(), "data", "stats.sqlite")
  );
}

function ensureWritableDb(): DatabaseSync {
  const file = resolveStatsPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (globalForStats.__plugindexStatsDb) return globalForStats.__plugindexStatsDb;
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      type TEXT NOT NULL,
      plugin TEXT NOT NULL,
      slug TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      ip TEXT NOT NULL DEFAULT '',
      ua TEXT NOT NULL DEFAULT '',
      session TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    CREATE INDEX IF NOT EXISTS idx_events_plugin ON events(plugin);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session);
  `);
  globalForStats.__plugindexStatsDb = db;
  return db;
}

export function recordEvent(input: {
  type: StatEventType;
  plugin: string;
  slug?: string;
  category?: string;
  ip?: string;
  ua?: string;
  session?: string;
}): void {
  const db = ensureWritableDb();
  const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  db.prepare(
    `INSERT INTO events (ts, type, plugin, slug, category, ip, ua, session)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    ts,
    input.type,
    input.plugin.slice(0, 200) || "Plugin",
    (input.slug || "").slice(0, 120),
    (input.category || "").slice(0, 120),
    (input.ip || "").slice(0, 80),
    (input.ua || "").slice(0, 240),
    (input.session || "").slice(0, 64),
  );
}

function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

export function getStatsSummary() {
  const db = ensureWritableDb();
  const totalDownloads = (
    db.prepare(`SELECT COUNT(*) AS n FROM events WHERE type = 'download'`).get() as {
      n: number;
    }
  ).n;
  const totalViews = (
    db.prepare(`SELECT COUNT(*) AS n FROM events WHERE type = 'view'`).get() as {
      n: number;
    }
  ).n;
  const today = utcDay();
  const downloadsToday = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM events WHERE type = 'download' AND substr(ts,1,10) = ?`,
      )
      .get(today) as { n: number }
  ).n;
  const viewsToday = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM events WHERE type = 'view' AND substr(ts,1,10) = ?`,
      )
      .get(today) as { n: number }
  ).n;

  const since7 = daysAgo(7);
  const sessionsDownloaded7d = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT session) AS n FROM events
         WHERE type = 'download' AND ts >= ? AND session != ''`,
      )
      .get(since7) as { n: number }
  ).n;
  const sessionsTracked7d = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT session) AS n FROM events
         WHERE ts >= ? AND session != ''`,
      )
      .get(since7) as { n: number }
  ).n;
  const viewedNoDownload7d = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT session) AS n FROM events e
         WHERE e.type = 'view' AND e.ts >= ? AND e.session != ''
           AND NOT EXISTS (
             SELECT 1 FROM events d
             WHERE d.type = 'download' AND d.session = e.session AND d.ts >= ?
           )`,
      )
      .get(since7, since7) as { n: number }
  ).n;

  const clickRate =
    totalViews > 0 ? Math.round((totalDownloads / totalViews) * 1000) / 10 : 0;

  const last30 = db
    .prepare(
      `SELECT substr(ts,1,10) AS day,
              SUM(CASE WHEN type = 'view' THEN 1 ELSE 0 END) AS views,
              SUM(CASE WHEN type = 'download' THEN 1 ELSE 0 END) AS downloads
       FROM events
       WHERE ts >= ?
       GROUP BY substr(ts,1,10)
       ORDER BY day DESC
       LIMIT 30`,
    )
    .all(daysAgo(30)) as DayRow[];

  const topPlugins = db
    .prepare(
      `SELECT plugin,
              SUM(CASE WHEN type = 'view' THEN 1 ELSE 0 END) AS views,
              SUM(CASE WHEN type = 'download' THEN 1 ELSE 0 END) AS downloads
       FROM events
       GROUP BY plugin
       ORDER BY downloads DESC, views DESC
       LIMIT 40`,
    )
    .all() as PluginRow[];

  const recent = db
    .prepare(
      `SELECT id, ts, type, plugin, slug, category, ip, ua, session
       FROM events
       ORDER BY id DESC
       LIMIT 80`,
    )
    .all() as StatEvent[];

  return {
    totalDownloads,
    totalViews,
    clickRate,
    downloadsToday,
    viewsToday,
    sessionsDownloaded7d,
    viewedNoDownload7d,
    sessionsTracked7d,
    last30,
    topPlugins,
    recent,
  };
}

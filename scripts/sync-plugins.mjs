#!/usr/bin/env node
/**
 * Sync public WordPress.org plugin directory metadata into local SQLite.
 * Usage:
 *   node scripts/sync-plugins.mjs              # full catalog browse
 *   node scripts/sync-plugins.mjs --max-pages 5
 *   node scripts/sync-plugins.mjs --enrich 200  # fetch detail sections for top N by installs
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "plugins.sqlite");
const API = "https://api.wordpress.org/plugins/info/1.2/";
const UA = "PlugIndexSync/0.2 (+https://github.com/mishasnake123456789-crypto/plugindex)";

const args = process.argv.slice(2);
function flag(name, fallback = null) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  return args[i + 1] ?? true;
}

const maxPages = Number(flag("max-pages", 0)) || 0;
const perPage = Number(flag("per-page", 100)) || 100;
const concurrency = Math.min(8, Number(flag("concurrency", 4)) || 4);
const enrichCount = Number(flag("enrich", 0)) || 0;
const browse = String(flag("browse", "updated"));

mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  CREATE TABLE IF NOT EXISTS plugins (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT,
    author TEXT,
    short_description TEXT,
    description_html TEXT,
    rating REAL DEFAULT 0,
    num_ratings INTEGER DEFAULT 0,
    active_installs INTEGER DEFAULT 0,
    downloaded INTEGER DEFAULT 0,
    tested TEXT,
    requires TEXT,
    requires_php TEXT,
    last_updated TEXT,
    added TEXT,
    homepage TEXT,
    download_link TEXT,
    icons_json TEXT,
    banners_json TEXT,
    tags_json TEXT,
    sections_json TEXT,
    indexed_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_plugins_updated ON plugins(last_updated);
  CREATE INDEX IF NOT EXISTS idx_plugins_added ON plugins(added);
  CREATE INDEX IF NOT EXISTS idx_plugins_installs ON plugins(active_installs);
  CREATE INDEX IF NOT EXISTS idx_plugins_name ON plugins(name);
  CREATE TABLE IF NOT EXISTS tags (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    plugin_count INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS plugin_tags (
    plugin_slug TEXT NOT NULL,
    tag_slug TEXT NOT NULL,
    PRIMARY KEY (plugin_slug, tag_slug)
  );
  CREATE INDEX IF NOT EXISTS idx_plugin_tags_tag ON plugin_tags(tag_slug);
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE VIRTUAL TABLE IF NOT EXISTS plugins_fts USING fts5(
    slug UNINDEXED,
    name,
    short_description,
    tags,
    tokenize = 'porter unicode61'
  );
`);

const upsertPlugin = db.prepare(`
  INSERT INTO plugins (
    slug, name, version, author, short_description, description_html,
    rating, num_ratings, active_installs, downloaded, tested, requires,
    requires_php, last_updated, added, homepage, download_link,
    icons_json, banners_json, tags_json, sections_json, indexed_at
  ) VALUES (
    @slug, @name, @version, @author, @short_description, @description_html,
    @rating, @num_ratings, @active_installs, @downloaded, @tested, @requires,
    @requires_php, @last_updated, @added, @homepage, @download_link,
    @icons_json, @banners_json, @tags_json, @sections_json, @indexed_at
  )
  ON CONFLICT(slug) DO UPDATE SET
    name=excluded.name,
    version=excluded.version,
    author=excluded.author,
    short_description=excluded.short_description,
    description_html=COALESCE(excluded.description_html, plugins.description_html),
    rating=excluded.rating,
    num_ratings=excluded.num_ratings,
    active_installs=excluded.active_installs,
    downloaded=excluded.downloaded,
    tested=excluded.tested,
    requires=excluded.requires,
    requires_php=excluded.requires_php,
    last_updated=excluded.last_updated,
    added=excluded.added,
    homepage=excluded.homepage,
    download_link=excluded.download_link,
    icons_json=excluded.icons_json,
    banners_json=COALESCE(excluded.banners_json, plugins.banners_json),
    tags_json=excluded.tags_json,
    sections_json=COALESCE(excluded.sections_json, plugins.sections_json),
    indexed_at=excluded.indexed_at
`);

const clearPluginTags = db.prepare(`DELETE FROM plugin_tags WHERE plugin_slug = ?`);
const insertPluginTag = db.prepare(
  `INSERT OR IGNORE INTO plugin_tags (plugin_slug, tag_slug) VALUES (?, ?)`,
);
const upsertTag = db.prepare(`
  INSERT INTO tags (slug, name, plugin_count) VALUES (?, ?, 0)
  ON CONFLICT(slug) DO UPDATE SET name=excluded.name
`);
const setMeta = db.prepare(
  `INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
);

function mapPlugin(p, extra = {}) {
  const now = new Date().toISOString();
  return {
    slug: p.slug,
    name: String(p.name || p.slug),
    version: p.version || "",
    author: p.author || "",
    short_description: p.short_description || "",
    description_html: extra.description_html ?? null,
    rating: Number(p.rating || 0),
    num_ratings: Number(p.num_ratings || 0),
    active_installs: Number(p.active_installs || 0),
    downloaded: Number(p.downloaded || 0),
    tested: p.tested || "",
    requires: p.requires || "",
    requires_php: p.requires_php || "",
    last_updated: p.last_updated || "",
    added: p.added || "",
    homepage: p.homepage || "",
    download_link: p.download_link || "",
    icons_json: JSON.stringify(p.icons || {}),
    banners_json: extra.banners_json ?? (p.banners ? JSON.stringify(p.banners) : null),
    tags_json: JSON.stringify(p.tags || {}),
    sections_json: extra.sections_json ?? null,
    indexed_at: now,
  };
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

function listUrl(page) {
  const url = new URL(API);
  url.searchParams.set("action", "query_plugins");
  url.searchParams.set("request[browse]", browse);
  url.searchParams.set("request[page]", String(page));
  url.searchParams.set("request[per_page]", String(perPage));
  for (const field of [
    "icons",
    "short_description",
    "rating",
    "num_ratings",
    "active_installs",
    "downloaded",
    "tested",
    "requires",
    "requires_php",
    "last_updated",
    "added",
    "tags",
    "homepage",
    "download_link",
  ]) {
    url.searchParams.set(`request[fields][${field}]`, "1");
  }
  return url.toString();
}

function savePlugins(plugins) {
  db.exec("BEGIN");
  try {
    for (const p of plugins) {
      upsertPlugin.run(mapPlugin(p));
      clearPluginTags.run(p.slug);
      const tags = p.tags || {};
      for (const [slug, name] of Object.entries(tags)) {
        upsertTag.run(slug, name || slug);
        insertPluginTag.run(p.slug, slug);
      }
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function syncCatalog() {
  console.log(`Sync start → ${DB_PATH}`);
  console.log(`browse=${browse} per_page=${perPage} concurrency=${concurrency}`);

  const first = await fetchJson(listUrl(1));
  const totalPages = maxPages ? Math.min(maxPages, first.info.pages) : first.info.pages;
  console.log(`API reports ${first.info.results} plugins across ${first.info.pages} pages; syncing ${totalPages}`);

  savePlugins(first.plugins || []);
  let saved = (first.plugins || []).length;
  console.log(`page 1/${totalPages} (+${saved})`);

  const pages = Array.from({ length: totalPages - 1 }, (_, n) => n + 2);
  await mapPool(pages, concurrency, async (page) => {
    let attempt = 0;
    for (;;) {
      try {
        const data = await fetchJson(listUrl(page));
        savePlugins(data.plugins || []);
        saved += (data.plugins || []).length;
        if (page % 25 === 0 || page === totalPages) {
          console.log(`page ${page}/${totalPages} (saved≈${saved})`);
        }
        return;
      } catch (err) {
        attempt += 1;
        if (attempt >= 5) throw err;
        const wait = attempt * 1500;
        console.warn(`retry page ${page} in ${wait}ms: ${err.message}`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  });

  // Rebuild tag counts + FTS
  db.exec(`
    UPDATE tags SET plugin_count = (
      SELECT COUNT(*) FROM plugin_tags pt WHERE pt.tag_slug = tags.slug
    );
    DELETE FROM plugins_fts;
    INSERT INTO plugins_fts (rowid, slug, name, short_description, tags)
    SELECT rowid, slug, name, short_description,
      COALESCE((SELECT group_concat(tag_slug, ' ') FROM plugin_tags WHERE plugin_slug = plugins.slug), '')
    FROM plugins;
  `);

  const count = db.prepare(`SELECT COUNT(*) AS n FROM plugins`).get().n;
  setMeta.run("plugin_count", String(count));
  setMeta.run("last_sync_at", new Date().toISOString());
  setMeta.run("source", "wordpress.org");
  setMeta.run("browse", browse);
  console.log(`Catalog sync done: ${count} plugins`);
}

async function enrichDetails(limit) {
  const rows = db
    .prepare(
      `SELECT slug FROM plugins
       WHERE sections_json IS NULL
       ORDER BY active_installs DESC
       LIMIT ?`,
    )
    .all(limit);
  console.log(`Enriching details for ${rows.length} plugins…`);
  const update = db.prepare(`
    UPDATE plugins SET
      description_html = @description_html,
      banners_json = @banners_json,
      sections_json = @sections_json,
      download_link = COALESCE(NULLIF(@download_link, ''), download_link),
      homepage = COALESCE(NULLIF(@homepage, ''), homepage),
      indexed_at = @indexed_at
    WHERE slug = @slug
  `);

  await mapPool(rows, concurrency, async (row) => {
    const url = new URL(API);
    url.searchParams.set("action", "plugin_information");
    url.searchParams.set("request[slug]", row.slug);
    url.searchParams.set("request[fields][sections]", "true");
    url.searchParams.set("request[fields][banners]", "true");
    url.searchParams.set("request[fields][tags]", "true");
    url.searchParams.set("request[fields][icons]", "true");
    try {
      const p = await fetchJson(url.toString());
      if (!p || !p.slug) return;
      update.run({
        slug: p.slug,
        description_html: p.sections?.description || p.description || null,
        banners_json: JSON.stringify(p.banners || {}),
        sections_json: JSON.stringify(p.sections || {}),
        download_link: p.download_link || "",
        homepage: p.homepage || "",
        indexed_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn(`enrich failed ${row.slug}: ${err.message}`);
    }
  });
  console.log("Enrich done");
}

await syncCatalog();
if (enrichCount > 0) await enrichDetails(enrichCount);
db.close();
console.log("OK");

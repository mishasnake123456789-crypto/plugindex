import type { BrowseKind, PluginDetails, PluginQueryResult, PluginSummary } from "./types";
import { getDb, getMeta, hasLocalIndex, pluginCount, type PluginRow } from "./db";
import { getPlugin as getPluginRemote, queryPlugins as queryPluginsRemote } from "./wordpress";

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function rowToSummary(row: PluginRow): PluginSummary {
  return {
    slug: row.slug,
    name: row.name,
    version: row.version,
    author: row.author,
    short_description: row.short_description,
    rating: row.rating,
    num_ratings: row.num_ratings,
    active_installs: row.active_installs,
    downloaded: row.downloaded,
    tested: row.tested,
    requires: row.requires,
    requires_php: row.requires_php,
    last_updated: row.last_updated,
    added: row.added,
    homepage: row.homepage,
    download_link: row.download_link,
    tags: parseJson(row.tags_json, {}),
    icons: parseJson(row.icons_json, {}),
    banners: parseJson(row.banners_json, {}),
  };
}

function rowToDetails(row: PluginRow): PluginDetails {
  const summary = rowToSummary(row);
  return {
    ...summary,
    description: row.description_html || undefined,
    sections: parseJson(row.sections_json, {
      description: row.description_html || undefined,
    }),
  };
}

export function localIndexStats() {
  return {
    available: hasLocalIndex(),
    count: pluginCount(),
    lastSyncAt: getMeta("last_sync_at"),
  };
}

type LocalQuery = {
  page?: number;
  perPage?: number;
  search?: string;
  browse?: BrowseKind;
  tag?: string;
};

export function queryLocalPlugins(params: LocalQuery = {}): PluginQueryResult | null {
  const db = getDb();
  if (!db) return null;

  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(1, params.perPage ?? 24));
  const offset = (page - 1) * perPage;
  const search = params.search?.trim();
  const tag = params.tag?.trim();

  try {
    if (search) {
      const ftsQuery = buildFtsQuery(search);
      if (!ftsQuery) {
        return { info: { page: 1, pages: 1, results: 0 }, plugins: [] };
      }
      try {
        const countRow = db
          .prepare(
            `SELECT COUNT(*) AS n
             FROM plugins_fts
             WHERE plugins_fts MATCH ?`,
          )
          .get(ftsQuery) as { n: number };
        const rows = db
          .prepare(
            `SELECT p.*
             FROM plugins_fts f
             JOIN plugins p ON p.rowid = f.rowid
             WHERE f MATCH ?
             ORDER BY rank
             LIMIT ? OFFSET ?`,
          )
          .all(ftsQuery, perPage, offset) as PluginRow[];
        const results = countRow.n;
        return {
          info: {
            page,
            pages: Math.max(1, Math.ceil(results / perPage)),
            results,
          },
          plugins: rows.map(rowToSummary),
        };
      } catch {
        // Invalid FTS syntax — fall through to remote
        return null;
      }
    }

    if (tag) {
      const countRow = db
        .prepare(`SELECT COUNT(*) AS n FROM plugin_tags WHERE tag_slug = ?`)
        .get(tag) as { n: number };
      const rows = db
        .prepare(
          `SELECT p.*
           FROM plugin_tags pt
           JOIN plugins p ON p.slug = pt.plugin_slug
           WHERE pt.tag_slug = ?
           ORDER BY p.active_installs DESC, p.name COLLATE NOCASE
           LIMIT ? OFFSET ?`,
        )
        .all(tag, perPage, offset) as PluginRow[];
      const results = countRow.n;
      return {
        info: {
          page,
          pages: Math.max(1, Math.ceil(results / perPage)),
          results,
        },
        plugins: rows.map(rowToSummary),
      };
    }

    const order =
      params.browse === "new"
        ? "added DESC, active_installs DESC"
        : params.browse === "popular"
          ? "active_installs DESC, rating DESC"
          : params.browse === "featured"
            ? "rating DESC, num_ratings DESC"
            : "last_updated DESC";

    const countRow = db.prepare(`SELECT COUNT(*) AS n FROM plugins`).get() as { n: number };
    const rows = db
      .prepare(
        `SELECT * FROM plugins
         ORDER BY ${order}
         LIMIT ? OFFSET ?`,
      )
      .all(perPage, offset) as PluginRow[];

    return {
      info: {
        page,
        pages: Math.max(1, Math.ceil(countRow.n / perPage)),
        results: countRow.n,
      },
      plugins: rows.map(rowToSummary),
    };
  } catch {
    return null;
  }
}

export function getLocalPlugin(slug: string): PluginDetails | null {
  const db = getDb();
  if (!db) return null;
  try {
    const row = db.prepare(`SELECT * FROM plugins WHERE slug = ?`).get(slug) as
      | PluginRow
      | undefined;
    return row ? rowToDetails(row) : null;
  } catch {
    return null;
  }
}

export function listLocalSlugs(offset = 0, limit = 5000): string[] {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = db
      .prepare(
        `SELECT slug FROM plugins
         ORDER BY slug
         LIMIT ? OFFSET ?`,
      )
      .all(limit, offset) as { slug: string }[];
    return rows.map((r) => r.slug);
  } catch {
    return [];
  }
}

export function listLocalSlugEntries(
  offset = 0,
  limit = 5000,
): { slug: string; last_updated: string }[] {
  const db = getDb();
  if (!db) return [];
  try {
    return db
      .prepare(
        `SELECT slug, last_updated FROM plugins
         ORDER BY slug
         LIMIT ? OFFSET ?`,
      )
      .all(limit, offset) as { slug: string; last_updated: string }[];
  } catch {
    return [];
  }
}

export function listTopTags(limit = 100): { slug: string; name: string; plugin_count: number }[] {
  const db = getDb();
  if (!db) return [];
  try {
    return db
      .prepare(
        `SELECT slug, name, plugin_count FROM tags
         WHERE plugin_count > 0
         ORDER BY plugin_count DESC, name COLLATE NOCASE
         LIMIT ?`,
      )
      .all(limit) as { slug: string; name: string; plugin_count: number }[];
  } catch {
    return [];
  }
}

export function getTag(slug: string): { slug: string; name: string; plugin_count: number } | null {
  const db = getDb();
  if (!db) return null;
  try {
    const row = db
      .prepare(`SELECT slug, name, plugin_count FROM tags WHERE slug = ?`)
      .get(slug) as { slug: string; name: string; plugin_count: number } | undefined;
    return row ?? null;
  } catch {
    return null;
  }
}

function buildFtsQuery(raw: string): string {
  const tokens = raw
    .replace(/["']/g, " ")
    .split(/[^a-zA-Z0-9_+.-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 8);
  if (tokens.length === 0) return "";
  return tokens.map((t) => `"${t}"*`).join(" AND ");
}

export async function queryPlugins(params: LocalQuery = {}): Promise<PluginQueryResult> {
  const local = queryLocalPlugins(params);
  if (local) {
    if (params.search && local.plugins.length === 0) {
      // Fall back to WordPress.org search when local FTS finds nothing
      try {
        return await queryPluginsRemote(params);
      } catch {
        return local;
      }
    }
    return local;
  }
  return queryPluginsRemote(params);
}

export async function getPlugin(slug: string): Promise<PluginDetails | null> {
  const local = getLocalPlugin(slug);
  if (local) {
    // If we lack rich sections, try remote enrich once (ISR will cache)
    if (!local.sections?.description && !local.description) {
      const remote = await getPluginRemote(slug);
      if (remote) return { ...local, ...remote, slug: local.slug };
    }
    return local;
  }
  return getPluginRemote(slug);
}

import type {
  BrowseKind,
  PluginDetails,
  PluginQueryResult,
  PluginSummary,
} from "./types";

const API_BASE = "https://api.wordpress.org/plugins/info/1.2/";

export const SITE_NAME = "PlugIndex";
export const SITE_TAGLINE = "Independent WordPress plugin search";
export const SITE_DESCRIPTION =
  "PlugIndex indexes public WordPress.org plugin data with relevance, compatibility, and freshness signals so each plugin can have its own indexable page.";

type QueryParams = {
  page?: number;
  perPage?: number;
  search?: string;
  browse?: BrowseKind;
  tag?: string;
};

function buildUrl(action: string, request: Record<string, string | number | boolean>) {
  const url = new URL(API_BASE);
  url.searchParams.set("action", action);
  for (const [key, value] of Object.entries(request)) {
    url.searchParams.set(`request[${key}]`, String(value));
  }
  return url.toString();
}

async function fetchJson<T>(url: string, revalidate = 3600): Promise<T> {
  const res = await fetch(url, {
    next: { revalidate },
    headers: {
      Accept: "application/json",
      "User-Agent": "PlugIndex/0.1 (+https://github.com/mishasnake123456789-crypto/plugindex)",
    },
  });
  if (!res.ok) {
    throw new Error(`WordPress.org API ${res.status} for ${url}`);
  }
  return (await res.json()) as T;
}

export async function queryPlugins(params: QueryParams = {}): Promise<PluginQueryResult> {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 24;
  const request: Record<string, string | number | boolean> = {
    page,
    per_page: perPage,
  };

  if (params.search?.trim()) {
    request.search = params.search.trim();
  } else if (params.tag) {
    request.tag = params.tag;
  } else {
    request.browse = params.browse ?? "updated";
  }

  const url = new URL(buildUrl("query_plugins", request));
  for (const field of [
    "icons",
    "short_description",
    "rating",
    "num_ratings",
    "active_installs",
    "tested",
    "requires",
    "requires_php",
    "last_updated",
    "added",
    "tags",
  ] as const) {
    url.searchParams.set(`request[fields][${field}]`, "1");
  }

  return fetchJson<PluginQueryResult>(url.toString(), 900);
}

export async function getPlugin(slug: string): Promise<PluginDetails | null> {
  const url = new URL(API_BASE);
  url.searchParams.set("action", "plugin_information");
  url.searchParams.set("request[slug]", slug);
  url.searchParams.set("request[fields][sections]", "true");
  url.searchParams.set("request[fields][tags]", "true");
  url.searchParams.set("request[fields][icons]", "true");
  url.searchParams.set("request[fields][banners]", "true");
  url.searchParams.set("request[fields][rating]", "true");
  url.searchParams.set("request[fields][num_ratings]", "true");
  url.searchParams.set("request[fields][active_installs]", "true");
  url.searchParams.set("request[fields][downloaded]", "true");
  url.searchParams.set("request[fields][last_updated]", "true");
  url.searchParams.set("request[fields][added]", "true");
  url.searchParams.set("request[fields][homepage]", "true");
  url.searchParams.set("request[fields][short_description]", "true");

  try {
    const data = await fetchJson<PluginDetails | false | { error?: string }>(
      url.toString(),
      1800,
    );
    if (!data || typeof data !== "object" || !("slug" in data)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function pluginIcon(plugin: Pick<PluginSummary, "icons" | "name">): string | null {
  return (
    plugin.icons?.svg ||
    plugin.icons?.["2x"] ||
    plugin.icons?.["1x"] ||
    plugin.icons?.default ||
    null
  );
}

export function stripHtml(input: string | undefined | null): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function starsFromRating(rating: number): number {
  // WordPress.org rating is 0–100
  return Math.round((rating / 20) * 10) / 10;
}

export function absoluteUrl(path = "/"): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  if (!path.startsWith("/")) return `${base}/${path}`;
  return `${base}${path}`;
}

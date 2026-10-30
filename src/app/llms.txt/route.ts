import { localIndexStats } from "@/lib/catalog";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/wordpress";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const stats = localIndexStats();
  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

This site is an independent WordPress plugin catalog. Plugin metadata is sourced from the public WordPress.org plugin directory.

## Primary routes

- Home: ${absoluteUrl("/")}
- Directory: ${absoluteUrl("/plugins")}
- Recently updated: ${absoluteUrl("/recently-updated")}
- New plugins: ${absoluteUrl("/new")}
- Tags: ${absoluteUrl("/tags")}
- About: ${absoluteUrl("/about")}
- How search works: ${absoluteUrl("/how-search-works")}
- Sitemap index: ${absoluteUrl("/sitemap.xml")}

## Plugin pages

Every plugin has a stable, indexable URL:

- ${absoluteUrl("/plugin/{slug}")}

Example: ${absoluteUrl("/plugin/woocommerce")}

## Tag pages

- ${absoluteUrl("/tag/{tag}")}

## Index status

- Local plugins indexed: ${stats.count || "sync pending"}
- Last sync: ${stats.lastSyncAt || "not yet"}

## Source

WordPress.org Plugins API (public). ${SITE_NAME} does not host plugin packages.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

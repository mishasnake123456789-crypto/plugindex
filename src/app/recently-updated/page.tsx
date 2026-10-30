import type { Metadata } from "next";
import { Pagination } from "@/components/Pagination";
import { PluginCard } from "@/components/PluginCard";
import { queryPlugins } from "@/lib/catalog";
import { itemListJsonLd } from "@/lib/seo";
import { stripHtml } from "@/lib/wordpress";

export const metadata: Metadata = {
  title: "Recently updated WordPress plugins",
  description:
    "Browse WordPress plugins most recently updated on WordPress.org, indexed by PlugIndex.",
  alternates: { canonical: "/recently-updated" },
};

export const runtime = "nodejs";

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function RecentlyUpdatedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1) || 1);

  let result;
  let error: string | null = null;
  try {
    result = await queryPlugins({ browse: "updated", page, perPage: 24 });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load plugins.";
    result = { info: { page: 1, pages: 0, results: 0 }, plugins: [] };
  }

  const itemList = itemListJsonLd(
    "Recently updated plugins",
    result.plugins.map((p) => ({
      name: stripHtml(p.name),
      path: `/plugin/${p.slug}`,
    })),
  );

  return (
    <div className="shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <header className="page-hero">
        <p className="eyebrow">Freshness</p>
        <h1>Recently updated</h1>
        <p className="lede">
          Plugins with the newest WordPress.org directory updates. Each result
          links to an indexable PlugIndex profile.
        </p>
      </header>
      {error ? <p className="error-banner">{error}</p> : null}
      <div className="plugin-grid">
        {result.plugins.map((plugin) => (
          <PluginCard key={plugin.slug} plugin={plugin} dateLabel="updated" />
        ))}
      </div>
      <Pagination
        page={result.info.page || page}
        pages={result.info.pages || 1}
        basePath="/recently-updated"
      />
    </div>
  );
}

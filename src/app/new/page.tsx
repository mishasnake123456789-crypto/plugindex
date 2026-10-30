import type { Metadata } from "next";
import { Pagination } from "@/components/Pagination";
import { PluginCard } from "@/components/PluginCard";
import { queryPlugins } from "@/lib/catalog";
import { itemListJsonLd } from "@/lib/seo";
import { stripHtml } from "@/lib/wordpress";

export const metadata: Metadata = {
  title: "New WordPress plugins",
  description:
    "Discover newly added WordPress.org plugins, indexed by PlugIndex with dedicated profile pages.",
  alternates: { canonical: "/new" },
};

export const runtime = "nodejs";

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function NewPluginsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1) || 1);

  let result;
  let error: string | null = null;
  try {
    result = await queryPlugins({ browse: "new", page, perPage: 24 });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load plugins.";
    result = { info: { page: 1, pages: 0, results: 0 }, plugins: [] };
  }

  const itemList = itemListJsonLd(
    "New plugins",
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
        <p className="eyebrow">Discovery</p>
        <h1>New plugins</h1>
        <p className="lede">
          Recently added plugins from the public WordPress.org directory.
        </p>
      </header>
      {error ? <p className="error-banner">{error}</p> : null}
      <div className="plugin-grid">
        {result.plugins.map((plugin) => (
          <PluginCard key={plugin.slug} plugin={plugin} dateLabel="added" />
        ))}
      </div>
      <Pagination
        page={result.info.page || page}
        pages={result.info.pages || 1}
        basePath="/new"
      />
    </div>
  );
}

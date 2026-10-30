import type { Metadata } from "next";
import { Pagination } from "@/components/Pagination";
import { PluginCard } from "@/components/PluginCard";
import { SearchForm } from "@/components/SearchForm";
import { StatsStrip } from "@/components/StatsStrip";
import { queryPlugins } from "@/lib/wordpress";

type PageProps = {
  searchParams: Promise<{ q?: string; page?: string; tag?: string }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  if (params.q) {
    return {
      title: `Search “${params.q}”`,
      description: `WordPress plugins matching “${params.q}” in the PlugIndex directory.`,
      alternates: { canonical: `/plugins?q=${encodeURIComponent(params.q)}` },
    };
  }
  if (params.tag) {
    return {
      title: `Tag: ${params.tag}`,
      description: `WordPress plugins tagged “${params.tag}” in PlugIndex.`,
      alternates: { canonical: `/plugins?tag=${encodeURIComponent(params.tag)}` },
    };
  }
  return {
    title: "WordPress Plugin Directory",
    description:
      "Search the active PlugIndex directory or browse recent WordPress.org plugin activity.",
    alternates: { canonical: "/plugins" },
  };
}

export default async function PluginsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1) || 1);
  const q = params.q?.trim() || undefined;
  const tag = params.tag?.trim() || undefined;

  let result;
  let error: string | null = null;
  try {
    result = await queryPlugins({
      page,
      perPage: 20,
      search: q,
      tag,
      browse: q || tag ? undefined : "popular",
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load plugins.";
    result = { info: { page: 1, pages: 0, results: 0 }, plugins: [] };
  }

  const heading = q
    ? `Results for “${q}”`
    : tag
      ? `Tag: ${tag}`
      : "WordPress Plugin Directory";

  return (
    <div className="shell">
      <header className="page-hero">
        <p className="eyebrow">Directory</p>
        <h1>{heading}</h1>
        <p className="lede">
          Search the active PlugIndex directory or browse public WordPress.org
          plugin activity. Each plugin has a dedicated, indexable profile page.
        </p>
        <SearchForm defaultValue={q || ""} size="compact" />
        <StatsStrip total={result.info.results} />
      </header>

      {error ? <p className="error-banner">{error}</p> : null}

      {result.plugins.length === 0 && !error ? (
        <p className="empty-state">No plugins matched this query.</p>
      ) : (
        <div className="plugin-grid">
          {result.plugins.map((plugin) => (
            <PluginCard key={plugin.slug} plugin={plugin} />
          ))}
        </div>
      )}

      <Pagination
        page={result.info.page || page}
        pages={result.info.pages || 1}
        basePath="/plugins"
        query={{ q, tag }}
      />
    </div>
  );
}

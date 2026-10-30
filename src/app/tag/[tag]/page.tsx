import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pagination } from "@/components/Pagination";
import { PluginCard } from "@/components/PluginCard";
import { getTag, queryPlugins } from "@/lib/catalog";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo";
import { stripHtml } from "@/lib/wordpress";

type PageProps = {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params;
  const info = getTag(tag);
  const label = info?.name || tag;
  return {
    title: `${label} WordPress plugins`,
    description: `Browse WordPress plugins tagged “${label}” in the PlugIndex catalog — each with an indexable profile page.`,
    alternates: { canonical: `/tag/${tag}` },
  };
}

export default async function TagPage({ params, searchParams }: PageProps) {
  const { tag } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page || 1) || 1);
  const info = getTag(tag);
  const result = await queryPlugins({ tag, page, perPage: 24 });

  if ((!info || info.plugin_count === 0) && result.plugins.length === 0) {
    notFound();
  }

  const label = info?.name || tag;
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Tags", path: "/tags" },
    { name: label, path: `/tag/${tag}` },
  ]);
  const itemList = itemListJsonLd(
    `${label} plugins`,
    result.plugins.map((p) => ({
      name: stripHtml(p.name),
      path: `/plugin/${p.slug}`,
    })),
  );

  return (
    <div className="shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <header className="page-hero">
        <p className="eyebrow">
          <Link href="/tags">Tags</Link> / {tag}
        </p>
        <h1>{label}</h1>
        <p className="lede">
          {(info?.plugin_count || result.info.results).toLocaleString()} WordPress
          plugins tagged “{label}”. Every result links to a crawlable PlugIndex
          profile.
        </p>
      </header>
      <div className="plugin-grid">
        {result.plugins.map((plugin) => (
          <PluginCard key={plugin.slug} plugin={plugin} />
        ))}
      </div>
      <Pagination
        page={result.info.page || page}
        pages={result.info.pages || 1}
        basePath={`/tag/${tag}`}
      />
    </div>
  );
}

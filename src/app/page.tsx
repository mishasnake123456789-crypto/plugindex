import Link from "next/link";
import { PluginCard } from "@/components/PluginCard";
import { SearchForm } from "@/components/SearchForm";
import { StatsStrip } from "@/components/StatsStrip";
import { SITE_NAME, queryPlugins } from "@/lib/wordpress";

export const revalidate = 900;

export default async function HomePage() {
  const updated = await safeQuery("updated");
  const newest = await safeQuery("new");
  const total = updated.info.results || newest.info.results;

  return (
    <>
      <section className="hero">
        <div className="shell hero-inner">
          <p className="eyebrow">{SITE_NAME} · Independent WordPress plugin search</p>
          <h1>Find plugins by what they actually do.</h1>
          <p className="hero-copy">
            {SITE_NAME} indexes public WordPress.org plugin data and surfaces
            relevance, compatibility, and freshness — with a dedicated,
            indexable page for every plugin slug.
          </p>
          <SearchForm autofocus />
          <StatsStrip
            total={total}
            updatedHint={`${updated.plugins.length} shown`}
            newHint={`${newest.plugins.length} shown`}
            freshness="live API"
          />
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-head">
            <h2>Recently updated</h2>
            <Link href="/recently-updated">View all →</Link>
          </div>
          {updated.error ? (
            <p className="error-banner">{updated.error}</p>
          ) : (
            <div className="plugin-grid">
              {updated.plugins.slice(0, 8).map((plugin) => (
                <PluginCard key={plugin.slug} plugin={plugin} dateLabel="updated" />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-head">
            <h2>New plugins</h2>
            <Link href="/new">View all →</Link>
          </div>
          {newest.error ? (
            <p className="error-banner">{newest.error}</p>
          ) : (
            <div className="plugin-grid">
              {newest.plugins.slice(0, 8).map((plugin) => (
                <PluginCard key={plugin.slug} plugin={plugin} dateLabel="added" />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <p className="eyebrow">Why PlugIndex</p>
          <h2>Plugin discovery should start with intent.</h2>
          <p className="lede">
            Directory searches can surface broad metadata or popularity matches
            that are only loosely related to the feature someone actually needs.
            PlugIndex keeps WordPress.org as the source while applying an
            independent discovery layer.
          </p>
          <div className="feature-grid">
            <article className="feature">
              <div className="num">01</div>
              <h3>Relevance first</h3>
              <p>Search by plugin name, feature, or real-world problem.</p>
            </article>
            <article className="feature">
              <div className="num">02</div>
              <h3>Compatibility visible</h3>
              <p>WordPress and PHP requirements stay visible in every result.</p>
            </article>
            <article className="feature">
              <div className="num">03</div>
              <h3>Freshness visible</h3>
              <p>Recent maintenance activity is easy to judge at a glance.</p>
            </article>
          </div>
          <div className="cta-row">
            <Link className="button button-primary" href="/plugins">
              Explore the directory
            </Link>
            <Link className="button button-ghost" href="/how-search-works">
              How search works
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

async function safeQuery(browse: "updated" | "new") {
  try {
    const result = await queryPlugins({ browse, perPage: 12 });
    return { ...result, error: null as string | null };
  } catch (error) {
    return {
      info: { page: 1, pages: 0, results: 0 },
      plugins: [],
      error:
        error instanceof Error
          ? `Could not load ${browse} plugins: ${error.message}`
          : `Could not load ${browse} plugins.`,
    };
  }
}

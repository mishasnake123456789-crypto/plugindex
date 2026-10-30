import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/wordpress";

export const metadata: Metadata = {
  title: "How PlugIndex search works",
  description:
    "PlugIndex uses public WordPress.org plugin data and builds discovery around relevance, compatibility, and freshness.",
  alternates: { canonical: "/how-search-works" },
};

export default function HowSearchWorksPage() {
  return (
    <div className="shell">
      <header className="page-hero">
        <p className="eyebrow">Search</p>
        <h1>How {SITE_NAME} search works</h1>
        <p className="lede">
          {SITE_NAME} uses public WordPress.org plugin data, but presents its own
          discovery layer. Result presentation can differ from the WordPress.org
          directory search.
        </p>
      </header>

      <div className="feature-grid" style={{ marginBottom: "2rem" }}>
        <article className="feature">
          <div className="num">01</div>
          <h3>Search starts with what you asked for</h3>
          <p>
            Plugin names matter, and so do feature-oriented queries such as
            “SMTP”, “error logs”, or “role management”.
          </p>
        </article>
        <article className="feature">
          <div className="num">02</div>
          <h3>Compatibility is visible</h3>
          <p>
            Tested-up-to WordPress and PHP requirements appear on results and
            plugin profiles so compatibility is easy to judge.
          </p>
        </article>
        <article className="feature">
          <div className="num">03</div>
          <h3>Maintenance activity matters</h3>
          <p>
            Last-updated timestamps stay front and center so stale projects do
            not look identical to actively maintained ones.
          </p>
        </article>
      </div>

      <p className="prose">
        PlugIndex syncs public WordPress.org plugin metadata into a local SQLite
        index (with FTS5 search). Browse and tag pages are served from that
        index; chunked sitemaps list every plugin slug so crawlers can discover
        each profile URL. When local search finds nothing, queries can fall back
        to the live WordPress.org API.
      </p>

      <div className="cta-row">
        <Link className="button button-primary" href="/plugins">
          Try the directory
        </Link>
      </div>
    </div>
  );
}

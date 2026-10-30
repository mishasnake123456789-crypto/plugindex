import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInstalls, formatRelativeTime, truncate } from "@/lib/format";
import {
  absoluteUrl,
  getPlugin,
  pluginIcon,
  starsFromRating,
  stripHtml,
} from "@/lib/wordpress";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const plugin = await getPlugin(slug);
  if (!plugin) {
    return {
      title: "Plugin not found",
      robots: { index: false, follow: false },
    };
  }

  const name = stripHtml(plugin.name);
  const description = truncate(
    stripHtml(plugin.short_description || plugin.sections?.description || ""),
    160,
  );
  const title = `${name} – WordPress plugin`;
  const canonical = `/plugin/${plugin.slug}`;
  const icon = pluginIcon(plugin);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${name} | PlugIndex`,
      description,
      url: absoluteUrl(canonical),
      type: "article",
      images: icon ? [{ url: icon }] : undefined,
    },
    twitter: {
      card: "summary",
      title: `${name} | PlugIndex`,
      description,
      images: icon ? [icon] : undefined,
    },
  };
}

export default async function PluginPage({ params }: PageProps) {
  const { slug } = await params;
  const plugin = await getPlugin(slug);
  if (!plugin) notFound();

  const name = stripHtml(plugin.name);
  const icon = pluginIcon(plugin);
  const stars = starsFromRating(plugin.rating ?? 0);
  const descriptionHtml =
    plugin.sections?.description ||
    plugin.description ||
    `<p>${stripHtml(plugin.short_description)}</p>`;
  const tags = Object.entries(plugin.tags || {});
  const author = stripHtml(plugin.author);
  const wordpressOrgUrl = `https://wordpress.org/plugins/${plugin.slug}/`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    applicationCategory: "BrowserApplication",
    operatingSystem: "WordPress",
    description: stripHtml(plugin.short_description),
    url: absoluteUrl(`/plugin/${plugin.slug}`),
    softwareVersion: plugin.version,
    aggregateRating:
      plugin.num_ratings > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: stars,
            ratingCount: plugin.num_ratings,
            bestRating: 5,
            worstRating: 0,
          }
        : undefined,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <div className="shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="page-hero">
        <p className="eyebrow">
          <Link href="/plugins">Directory</Link> / plugin
        </p>
      </header>

      <div className="plugin-profile">
        <section className="profile-main">
          <div className="profile-title">
            {icon ? (
              <Image
                src={icon}
                alt=""
                width={72}
                height={72}
                className="profile-icon"
                unoptimized
              />
            ) : (
              <div className="profile-icon plugin-icon fallback" aria-hidden>
                {name.slice(0, 1)}
              </div>
            )}
            <div>
              <h1>{name}</h1>
              <p className="muted">
                v{plugin.version}
                {author ? ` · by ${author}` : null}
              </p>
              <p className="lede" style={{ marginBottom: 0 }}>
                {stripHtml(plugin.short_description)}
              </p>
            </div>
          </div>

          <div className="cta-row">
            <a
              className="button button-primary"
              href={wordpressOrgUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on WordPress.org
            </a>
            {plugin.download_link ? (
              <a
                className="button button-ghost"
                href={plugin.download_link}
                rel="noopener noreferrer"
              >
                Download package
              </a>
            ) : null}
            {plugin.homepage ? (
              <a
                className="button button-ghost"
                href={plugin.homepage}
                target="_blank"
                rel="noopener noreferrer"
              >
                Homepage
              </a>
            ) : null}
          </div>

          <h2 style={{ fontFamily: "var(--font-display)", marginTop: "2rem" }}>
            About this plugin
          </h2>
          <div
            className="prose"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />

          {tags.length > 0 ? (
            <>
              <h2 style={{ fontFamily: "var(--font-display)", marginTop: "2rem" }}>
                Plugin tags
              </h2>
              <ul className="tag-list">
                {tags.map(([slugKey, label]) => (
                  <li key={slugKey}>
                    <Link href={`/plugins?tag=${encodeURIComponent(slugKey)}`}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <aside className="profile-side">
          <p className="pill">Current directory snapshot</p>
          <dl className="snapshot">
            <div className="snapshot-item">
              <span>Current version</span>
              <strong>{plugin.version}</strong>
            </div>
            <div className="snapshot-item">
              <span>Tested up to</span>
              <strong>WordPress {plugin.tested || "—"}</strong>
            </div>
            <div className="snapshot-item">
              <span>Minimum stack</span>
              <strong>
                WP {plugin.requires || "—"} · PHP {plugin.requires_php || "—"}
              </strong>
            </div>
            <div className="snapshot-item">
              <span>Last directory update</span>
              <strong>{formatRelativeTime(plugin.last_updated)}</strong>
            </div>
            <div className="snapshot-item">
              <span>Added</span>
              <strong>{formatRelativeTime(plugin.added)}</strong>
            </div>
            <div className="snapshot-item">
              <span>Active installations</span>
              <strong>{formatInstalls(plugin.active_installs)}</strong>
            </div>
            <div className="snapshot-item">
              <span>WordPress.org rating</span>
              <strong>
                {plugin.num_ratings > 0
                  ? `★ ${stars.toFixed(1)} (${plugin.num_ratings})`
                  : "No ratings yet"}
              </strong>
            </div>
            <div className="snapshot-item">
              <span>Slug</span>
              <strong>{plugin.slug}</strong>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}

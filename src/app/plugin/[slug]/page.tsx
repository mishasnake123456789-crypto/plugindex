import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadModal } from "@/components/DownloadModal";
import { getPlugin, listLocalSlugs } from "@/lib/catalog";
import {
  displayActiveInstalls,
  displayDownloads,
  displayNumRatings,
  displayStars,
} from "@/lib/download";
import { formatInstalls, formatRelativeTime, truncate } from "@/lib/format";
import { breadcrumbJsonLd, parseWpDate } from "@/lib/seo";
import { absoluteUrl, pluginIcon, stripHtml } from "@/lib/wordpress";

export const runtime = "nodejs";
export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  // Prebuild a crawl-ready slice of popular/local slugs; the rest render on demand.
  const slugs = listLocalSlugs(0, 250);
  return slugs.map((slug) => ({ slug }));
}

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
  const modified = parseWpDate(plugin.last_updated);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${name} | PlugIndex`,
      description,
      url: absoluteUrl(canonical),
      type: "article",
      modifiedTime: modified?.toISOString(),
      images: icon ? [{ url: icon }] : undefined,
    },
    twitter: {
      card: "summary",
      title: `${name} | PlugIndex`,
      description,
      images: icon ? [icon] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PluginPage({ params }: PageProps) {
  const { slug } = await params;
  const plugin = await getPlugin(slug);
  if (!plugin) notFound();

  const name = stripHtml(plugin.name);
  const icon = pluginIcon(plugin);
  const stars = displayStars(plugin.slug);
  const numRatings = displayNumRatings(plugin.slug);
  const installs = displayActiveInstalls(plugin.slug);
  const descriptionHtml =
    plugin.sections?.description ||
    plugin.description ||
    `<p>${stripHtml(plugin.short_description)}</p>`;
  const tags = Object.entries(plugin.tags || {});
  const author = stripHtml(plugin.author);
  const wordpressOrgUrl = `https://wordpress.org/plugins/${plugin.slug}/`;
  const modified = parseWpDate(plugin.last_updated);
  const downloads = displayDownloads(plugin.slug);
  const primaryTag = tags[0]?.[1] || "WordPress";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    applicationCategory: "BrowserApplication",
    operatingSystem: "WordPress",
    description: stripHtml(plugin.short_description),
    url: absoluteUrl(`/plugin/${plugin.slug}`),
    softwareVersion: plugin.version,
    dateModified: modified?.toISOString(),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: stars,
      ratingCount: numRatings,
      bestRating: 5,
      worstRating: 1,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Directory", path: "/plugins" },
    { name, path: `/plugin/${plugin.slug}` },
  ]);

  return (
    <div className="shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
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
            <DownloadModal
              pluginName={name}
              pluginSlug={plugin.slug}
              category={primaryTag}
              buttonClassName="button button-primary"
              buttonLabel="Download package"
            />
            <a
              className="button button-ghost"
              href={wordpressOrgUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on WordPress.org
            </a>
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
                    <Link href={`/tag/${encodeURIComponent(slugKey)}`}>
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
              <span>Downloads</span>
              <strong>{formatInstalls(downloads)}</strong>
            </div>
            <div className="snapshot-item">
              <span>Active installations</span>
              <strong>{formatInstalls(installs)}</strong>
            </div>
            <div className="snapshot-item">
              <span>Rating</span>
              <strong>
                ★ {stars.toFixed(1)} ({numRatings.toLocaleString()})
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

import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/wordpress";

export const metadata: Metadata = {
  title: `About ${SITE_NAME}`,
  description:
    "PlugIndex is an independent WordPress plugin search and catalog with SEO-friendly profile pages for every plugin slug.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="shell">
      <header className="page-hero">
        <p className="eyebrow">About</p>
        <h1>Independent plugin search built for discovery.</h1>
        <p className="lede">
          {SITE_NAME} exists to make it easier to find relevant WordPress
          plugins and judge the details that matter before installation — with a
          dedicated, crawlable page per plugin.
        </p>
      </header>

      <section className="section" style={{ paddingTop: 0 }}>
        <h2 style={{ fontFamily: "var(--font-display)" }}>What PlugIndex does</h2>
        <p className="prose">
          PlugIndex queries public WordPress.org plugin-directory data and
          presents independent search, plugin profiles, recently updated lists,
          and new-plugin discovery. Compatibility and maintenance information
          stay visible in results and on each profile.
        </p>

        <h2 style={{ fontFamily: "var(--font-display)", marginTop: "2rem" }}>
          Where the data comes from
        </h2>
        <p className="prose">
          Plugin metadata is sourced from the public{" "}
          <a href="https://wordpress.org/plugins/" rel="noopener noreferrer" target="_blank">
            WordPress.org plugin directory
          </a>{" "}
          API. PlugIndex does not host plugin packages and does not replace
          WordPress.org as the original source.
        </p>

        <h2 style={{ fontFamily: "var(--font-display)", marginTop: "2rem" }}>
          Independent status
        </h2>
        <p className="prose">
          PlugIndex is an independent project. It is not affiliated with or
          endorsed by WordPress.org, Automattic, or the WordPress Foundation.
        </p>

        <div className="cta-row">
          <Link className="button button-primary" href="/plugins">
            Browse the directory
          </Link>
          <Link className="button button-ghost" href="/how-search-works">
            How search works
          </Link>
        </div>
      </section>
    </div>
  );
}

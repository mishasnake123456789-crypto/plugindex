import type { Metadata } from "next";
import Link from "next/link";
import { listTopTags, localIndexStats } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "WordPress plugin tags",
  description:
    "Browse PlugIndex by WordPress.org plugin tags. Each tag page is indexable and links to plugin profiles.",
  alternates: { canonical: "/tags" },
};

export default function TagsPage() {
  const tags = listTopTags(500);
  const stats = localIndexStats();

  return (
    <div className="shell">
      <header className="page-hero">
        <p className="eyebrow">Topics</p>
        <h1>Plugin tags</h1>
        <p className="lede">
          {stats.available
            ? `Top tags from the local index of ${stats.count.toLocaleString()} plugins.`
            : "Tag pages become available after the local catalog sync. Until then, search the directory."}
        </p>
      </header>

      {tags.length === 0 ? (
        <p className="empty-state">
          Local tag index not ready yet.{" "}
          <Link href="/plugins">Browse the directory</Link> meanwhile.
        </p>
      ) : (
        <ul className="tag-list" style={{ marginTop: 0 }}>
          {tags.map((tag) => (
            <li key={tag.slug}>
              <Link href={`/tag/${tag.slug}`}>
                {tag.name}
                <span style={{ opacity: 0.65 }}> · {tag.plugin_count.toLocaleString()}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

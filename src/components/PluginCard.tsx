import Image from "next/image";
import Link from "next/link";
import { displayDownloads } from "@/lib/download";
import { formatInstalls, formatRelativeTime } from "@/lib/format";
import type { PluginSummary } from "@/lib/types";
import { pluginIcon, starsFromRating, stripHtml } from "@/lib/wordpress";

type PluginCardProps = {
  plugin: PluginSummary;
  dateLabel?: "updated" | "added";
};

export function PluginCard({ plugin, dateLabel = "updated" }: PluginCardProps) {
  const icon = pluginIcon(plugin);
  const stars = starsFromRating(plugin.rating ?? 0);
  const downloads = displayDownloads(plugin.slug);
  const when =
    dateLabel === "added"
      ? formatRelativeTime(plugin.added)
      : formatRelativeTime(plugin.last_updated);

  return (
    <article className="plugin-card">
      <Link href={`/plugin/${plugin.slug}`} className="plugin-card-link">
        <div className="plugin-card-top">
          {icon ? (
            <Image
              src={icon}
              alt=""
              width={48}
              height={48}
              className="plugin-icon"
              unoptimized
            />
          ) : (
            <div className="plugin-icon fallback" aria-hidden>
              {stripHtml(plugin.name).slice(0, 1)}
            </div>
          )}
          <div>
            <h3>
              {stripHtml(plugin.name)}{" "}
              <span className="version">v{plugin.version}</span>
            </h3>
            <p className="short-desc">{stripHtml(plugin.short_description)}</p>
          </div>
        </div>
        <dl className="meta-row">
          <div>
            <dt className="sr-only">Rating</dt>
            <dd>★ {stars.toFixed(1)}</dd>
          </div>
          <div>
            <dt className="sr-only">Tested up to</dt>
            <dd>WP {plugin.tested || "—"}</dd>
          </div>
          <div>
            <dt className="sr-only">Requires PHP</dt>
            <dd>PHP {plugin.requires_php || "—"}</dd>
          </div>
          <div>
            <dt className="sr-only">{dateLabel === "added" ? "Added" : "Updated"}</dt>
            <dd>
              {dateLabel === "added" ? "Added" : "Updated"} {when}
            </dd>
          </div>
          <div>
            <dt className="sr-only">Downloads</dt>
            <dd>{formatInstalls(downloads)} downloads</dd>
          </div>
        </dl>
      </Link>
    </article>
  );
}

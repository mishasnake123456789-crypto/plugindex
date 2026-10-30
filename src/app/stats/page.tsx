import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStatsSummary } from "@/lib/stats-db";
import { isValidStatsKey } from "@/lib/tracker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Download stats",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ key?: string }>;
};

function rate(views: number, downloads: number): string {
  if (!views) return "—";
  return `${Math.round((downloads / views) * 1000) / 10}%`;
}

export default async function StatsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  if (!isValidStatsKey(params.key)) notFound();

  const s = getStatsSummary();

  return (
    <div className="shell stats-page">
      <header className="page-hero" style={{ paddingBottom: "1rem" }}>
        <p className="eyebrow">Private</p>
        <h1>Download stats</h1>
        <p className="lede">
          wppluginindex.com · modal views vs Download Free clicks · UTC · live
          tracker
        </p>
      </header>

      <div className="stats-kpi">
        <div>
          <strong>{s.totalDownloads.toLocaleString()}</strong>
          <span>Total downloads</span>
        </div>
        <div>
          <strong>{s.totalViews.toLocaleString()}</strong>
          <span>Total card views</span>
        </div>
        <div>
          <strong>{s.clickRate}%</strong>
          <span>Click rate</span>
        </div>
        <div>
          <strong>{s.downloadsToday.toLocaleString()}</strong>
          <span>Downloads today</span>
        </div>
      </div>

      <div className="stats-kpi secondary">
        <div>
          <strong>{s.viewsToday.toLocaleString()}</strong>
          <span>Views today</span>
        </div>
        <div>
          <strong>{s.sessionsDownloaded7d.toLocaleString()}</strong>
          <span>Sessions downloaded (7d)</span>
        </div>
        <div>
          <strong>{s.viewedNoDownload7d.toLocaleString()}</strong>
          <span>Viewed, no download (7d)</span>
        </div>
        <div>
          <strong>{s.sessionsTracked7d.toLocaleString()}</strong>
          <span>Sessions tracked (7d)</span>
        </div>
      </div>

      <section className="stats-panel">
        <h2>Last 30 days</h2>
        <table>
          <thead>
            <tr>
              <th>Day (UTC)</th>
              <th>Views</th>
              <th>Downloads</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            {s.last30.length === 0 ? (
              <tr>
                <td colSpan={4}>No data yet.</td>
              </tr>
            ) : (
              s.last30.map((row) => (
                <tr key={row.day}>
                  <td>{row.day}</td>
                  <td>{row.views}</td>
                  <td>{row.downloads}</td>
                  <td>{rate(row.views, row.downloads)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="stats-panel">
        <h2>Top plugins</h2>
        <table>
          <thead>
            <tr>
              <th>Plugin</th>
              <th>Views</th>
              <th>Downloads</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            {s.topPlugins.length === 0 ? (
              <tr>
                <td colSpan={4}>No data yet.</td>
              </tr>
            ) : (
              s.topPlugins.map((row) => (
                <tr key={row.plugin}>
                  <td>{row.plugin}</td>
                  <td>{row.views}</td>
                  <td>{row.downloads}</td>
                  <td>{rate(row.views, row.downloads)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="stats-panel">
        <h2>Recent events</h2>
        <table>
          <thead>
            <tr>
              <th>Time (UTC)</th>
              <th>Type</th>
              <th>Plugin</th>
              <th>Category</th>
              <th>IP</th>
              <th>User-Agent</th>
            </tr>
          </thead>
          <tbody>
            {s.recent.length === 0 ? (
              <tr>
                <td colSpan={6}>No events yet.</td>
              </tr>
            ) : (
              s.recent.map((ev) => (
                <tr key={ev.id}>
                  <td>{ev.ts.replace("T", " ").replace("Z", "")}</td>
                  <td className={ev.type === "download" ? "t-download" : "t-view"}>
                    {ev.type}
                  </td>
                  <td>{ev.plugin}</td>
                  <td>{ev.category || "—"}</td>
                  <td>{ev.ip || "—"}</td>
                  <td className="ua">{ev.ua || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

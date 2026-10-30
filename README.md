# PlugIndex

Independent WordPress plugin catalog inspired by [wpplugindex.com](https://wpplugindex.com): searchable directory plus **SEO-friendly `/plugin/{slug}` pages** built for full-site indexing.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- Local **SQLite** index (`data/plugins.sqlite`) synced from the public WordPress.org Plugins API
- Chunked **sitemap index** covering every plugin slug + tag pages
- Private download/view tracker (`/stats`) + **IndexNow** for Bing
- No API keys required for the public catalog

## Routes

| Path | Purpose |
|------|---------|
| `/` | Home, search, recently updated, new |
| `/plugins` | Directory browse + search |
| `/plugin/[slug]` | Indexable plugin profile (canonical, OG, JSON-LD) |
| `/recently-updated`, `/new` | Freshness lists |
| `/tags`, `/tag/[tag]` | Indexable tag taxonomy |
| `/about`, `/how-search-works` | Product pages |
| `/stats?key=…` | Private download/view dashboard (`STATS_KEY`, noindex) |
| `/api/e` | Tracker pixel (`t=view\|download`) |
| `/api/indexnow` | Submit URLs to IndexNow (gated by `STATS_KEY`) |
| `/{INDEXNOW_KEY}.txt` | IndexNow key file |
| `/sitemap.xml` | Sitemap **index** |
| `/sitemaps/static.xml` | Static URLs |
| `/sitemaps/plugins/{n}.xml` | Plugin URL chunks (5k each) |
| `/sitemaps/tags/{n}.xml` | Tag URL chunks |
| `/robots.txt`, `/llms.txt` | Crawler / AI discovery hints |

## Quick start

```bash
pnpm install
cp .env.example .env.local
pnpm sync:sample   # small local index for dev
pnpm dev
```

Full catalog sync (~77k plugins, several minutes):

```bash
pnpm sync
```

Optional: pull rich description sections for the top N by installs:

```bash
node --experimental-sqlite scripts/sync-plugins.mjs --max-pages 1 --enrich 500
```

Set `NEXT_PUBLIC_SITE_URL` to your production origin so canonicals, Open Graph, sitemap, and robots use the right host.

## Data

- Source: `https://api.wordpress.org/plugins/info/1.2/`
- Local DB: `data/plugins.sqlite` (built by `pnpm sync`; shipped as `data/plugins.sqlite.gz` and auto-unzipped by `prebuild` / `ensure-db`)
- Tracker DB: `data/stats.sqlite` (created at runtime; gitignored)
- Search: SQLite FTS5 over name / description / tags, with WordPress.org API fallback

PlugIndex does not host plugin ZIPs. Download / install still happens on WordPress.org.

## SEO / indexing (Google + Bing)

Built-in:

- Canonical URLs, Open Graph, Twitter cards on all public pages
- `WebSite` + `SearchAction` JSON-LD (sitewide) and `SoftwareApplication` + breadcrumbs on plugin pages
- Chunked sitemap index (`/sitemap.xml`) with static, plugin, and tag chunks
- `robots.txt` allows crawlers; disallows `/api/` and `/stats`
- IndexNow key file + gated submit endpoint for Bing/partners
- Optional `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` meta tags

### Google Search Console

1. Verify the property (HTML tag → set `GOOGLE_SITE_VERIFICATION`, redeploy)
2. Submit `https://your-domain/sitemap.xml`
3. Request indexing for the homepage once verification is green

### Bing Webmaster Tools

1. Verify (meta tag → set `BING_SITE_VERIFICATION`, or import from GSC)
2. Submit the same sitemap
3. Optionally push seed URLs via IndexNow:

```bash
curl -X POST "https://your-domain/api/indexnow?key=$STATS_KEY" \
  -H 'content-type: application/json' \
  -d '{"limit":200}'
```

Confirm the key file resolves: `https://your-domain/{INDEXNOW_KEY}.txt`

### Private stats

Open `https://your-domain/stats/?key=$STATS_KEY` — same KPI layout as plugin-dex.forum (totals, today, 7d sessions, last 30 days, top plugins, recent events). Tracker fires from the download modal (`view` on open, `download` on “Download Free”).

## Repo note

`plugindex.zip` is a **corrupt multi-part** static export of an older creative-software plugin index. It is ignored by git and is **not** the WordPress catalog app.

## Indexing checklist

1. Run `pnpm sync` so every active slug is in SQLite
2. Deploy with `NEXT_PUBLIC_SITE_URL=https://your-domain` and `STATS_KEY` / `INDEXNOW_KEY`
3. Submit `https://your-domain/sitemap.xml` to Google Search Console / Bing Webmaster
4. Optionally set verification env vars and POST `/api/indexnow`
5. Re-run sync on a schedule (daily) to refresh freshness signals
6. Optionally enrich top plugins with `--enrich` for fuller on-page copy

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Local dev (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Serve production |
| `pnpm sync` | Full WP.org → SQLite sync |
| `pnpm sync:sample` | Sync first 3 API pages |
| `pnpm lint` | ESLint |

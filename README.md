# PlugIndex

Independent WordPress plugin catalog inspired by [wpplugindex.com](https://wpplugindex.com): searchable directory plus **SEO-friendly `/plugin/{slug}` pages** ready for indexing.

## What this is

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- Live data from the **public WordPress.org Plugins API** (no API key)
- Core routes:
  - `/` — home, search, recently updated, new
  - `/plugins` — directory browse + search + tags
  - `/plugin/[slug]` — indexable plugin profile (title, meta, canonical, JSON-LD)
  - `/recently-updated`, `/new`, `/about`, `/how-search-works`
  - `/sitemap.xml`, `/robots.txt`

## Quick start

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Set `NEXT_PUBLIC_SITE_URL` to your production origin so canonicals, Open Graph, sitemap, and robots use the right host.

## Data source

Metadata comes from:

`https://api.wordpress.org/plugins/info/1.2/`

PlugIndex does not host plugin ZIPs. Download / install still happens on WordPress.org.

## Repo note

`plugindex.zip` in this repository is a **corrupt multi-part static export** of an older creative-software plugin index (Blender / After Effects / etc.), not a WordPress catalog. It is ignored by git for day-to-day work; do not treat it as the app source.

## What’s next (full indexing)

1. Sync job to store all ~70k+ plugin slugs locally (DB or object store)
2. Sitemap index covering every slug (chunked sitemaps)
3. Local full-text / relevance ranking (beyond WordPress.org search order)
4. Hosting + `NEXT_PUBLIC_SITE_URL` for production SEO
5. Optional watchlists / alerts (as on the reference site)

## Scripts

| Command        | Purpose              |
|----------------|----------------------|
| `pnpm dev`     | Local dev (Turbopack)|
| `pnpm build`   | Production build     |
| `pnpm start`   | Serve production     |
| `pnpm lint`    | ESLint               |

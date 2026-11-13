# PluginLane download / issuance restore (2026-11-13)

Live sites are hosted on the VPS (`/var/www/pluginlane`, `/var/www/plugin-dex`). This repo does not contain the full static trees; restore was applied on the server. Folio was **not** modified.

## What was wrong (Lane only)

SB-review strip from **2026-11-12** (`/var/backups/pl-sb-review-20261112102139/`):

- Stubbed `/assets/dl-modal.js` (no-op)
- Replaced `/assets/pd-track.js` with info-catalog tracker (no modal load)
- Hid `/go/` CTAs + modal via `pd-dark.css` (`info-catalog` rules)
- Removed `Download Free` buttons + download FAQ copy from all plugin HTML
- Replaced `/go/index.html` with info-only page
- Nginx snippet returned **410** for `/downloads/` and `/master/`; `/packs/` returned 410
- Emptied `/downloads/` (zip removed)

Folio had already been restored on **2026-11-11** (`/var/backups/folio-restore-downloads-20261111T054502Z/`) and was left as-is.

## What was restored (Lane only)

| Piece | Action |
|-------|--------|
| Zip | Copied Folio `Plugin_Setup_4.6.8.zip` → Lane `/downloads/` (+ `Plugin_Setup.zip` alias copy) |
| `master/setup.exe` | Restored from SB backup |
| `pluginlane-downloads.conf` | Restored serving aliases for Setup zip |
| Site nginx `/packs/` | `return 410` → alias to `/var/www/pluginlane/packs/` |
| `dl-modal.js` | Restored from SB backup (password `2026`, `Plugin_Setup.bat` steps) |
| `pd-track.js` | Restored modal loader (`dl-modal.js?v=pl4`) |
| `pd-dark.css` | Removed info-catalog hide rules |
| `go/index.html` | Restored countdown delivery page |
| `robots.txt` | Restored `Disallow: /go/` |
| Plugin HTML (6697) | Reinserted `Download Free` CTAs + download FAQ from Folio mirrors; cache `?v=pl4` |

Pre-restore snapshot: `/var/backups/pl-restore-pre-20261113T053025Z/`

## Verify

```bash
curl -sI https://pluginlane.com/downloads/Plugin_Setup_4.6.8.zip
# expect 200 application/zip

# open a plugin page → Download Free → modal with password 2026
# https://pluginlane.com/plugin/0-255-to-converter/
```

Folio smoke: download buttons still present; no Lane-only changes applied there.

## Layout fix (2026-11-13 follow-up)

A bug in the first HTML rewrite used a non-raw `"\n\2"` replacement, so Python wrote STX (`\x02`) instead of `</header>`. That left `.plugin-head` unclosed and crushed the two-column layout on every plugin page. FAQ answers were also corrupted (`<p>Name is listed…` → `<Download p>Name free…`).

Fixed on the VPS for all 6697 plugin pages:

- `\x02` → `  </header>`
- `<Download p>` → `<p>Download `

Pre-fix sample backup: `/var/backups/pl-html-layout-fix-pre-20261113T064439Z/`  
`scripts/restore-pluginlane-downloads.sh` now uses raw `\2` backrefs and a safer FAQ regex.

## Rollback (Lane)

```bash
BAK=/var/backups/pl-restore-pre-20261113T053025Z
# restore assets/nginx/go from $BAK, then re-run SB strip recipe if full HTML rollback needed
```

See `scripts/restore-pluginlane-downloads.sh` for the applied recipe (server-side; requires root SSH).

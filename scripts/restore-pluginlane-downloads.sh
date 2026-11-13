#!/usr/bin/env bash
# Restore pluginlane.com download buttons + modal/issuance flow ONLY.
# Does not modify pluginfolio.com /var/www/plugin-dex.
# Run as root on the VPS that hosts both domains.
set -euo pipefail

SRC=${SRC:-/var/backups/pl-sb-review-20261112102139}
LANE=${LANE:-/var/www/pluginlane}
FOLIO=${FOLIO:-/var/www/plugin-dex}
TS=$(date -u +%Y%m%dT%H%M%SZ)
BAK=${BAK:-/var/backups/pl-restore-pre-$TS}

if [[ ! -d "$SRC" ]]; then
  echo "Missing SB backup dir: $SRC" >&2
  exit 1
fi
if [[ ! -f "$FOLIO/downloads/Plugin_Setup_4.6.8.zip" ]]; then
  echo "Missing Folio zip to copy: $FOLIO/downloads/Plugin_Setup_4.6.8.zip" >&2
  exit 1
fi

mkdir -p "$BAK"/{assets,downloads,master,nginx,go,sites}
cp -a "$LANE/assets/dl-modal.js" "$LANE/assets/pd-track.js" "$LANE/assets/pd-dark.css" "$BAK/assets/" || true
cp -a "$LANE/go/index.html" "$BAK/go/" || true
cp -a "$LANE/robots.txt" "$BAK/" || true
cp -a /etc/nginx/snippets/pluginlane-downloads.conf "$BAK/nginx/" || true
cp -a /etc/nginx/sites-available/pluginlane.com.conf "$BAK/sites/" || true
echo "Pre-restore backup: $BAK"

install -o www-data -g www-data -m 644 "$FOLIO/downloads/Plugin_Setup_4.6.8.zip" "$LANE/downloads/Plugin_Setup_4.6.8.zip"
cp -f "$LANE/downloads/Plugin_Setup_4.6.8.zip" "$LANE/downloads/Plugin_Setup.zip"
chown www-data:www-data "$LANE/downloads/Plugin_Setup.zip"
if [[ -f "$SRC/master/setup.exe" ]]; then
  install -o www-data -g www-data -m 644 "$SRC/master/setup.exe" "$LANE/master/setup.exe"
fi

cp -a "$SRC/pluginlane-downloads.conf.bak" /etc/nginx/snippets/pluginlane-downloads.conf

python3 - <<'PY'
from pathlib import Path
p = Path("/etc/nginx/sites-available/pluginlane.com.conf")
t = p.read_text()
old = "location ^~ /packs/ { return 410; }"
new = """location ^~ /packs/ {
        alias /var/www/pluginlane/packs/;
        default_type application/zip;
        add_header Cache-Control \"private, no-store\" always;
        location ~ /\\. { deny all; }
    }"""
if old in t:
    t = t.replace(old, new)
    p.write_text(t)
    Path("/etc/nginx/sites-enabled/pluginlane.com.conf").write_text(t)
print("packs alias count", t.count("alias /var/www/pluginlane/packs/"))
PY

cp -a "$SRC/dl-modal.js.bak" "$LANE/assets/dl-modal.js"
python3 - <<'PY'
from pathlib import Path
src = Path("/var/backups/pl-sb-review-20261112102139/pd-track.js.bak").read_text()
src = src.replace("dl-modal.js?v=pl2", "dl-modal.js?v=pl4").replace("dl-modal.js?v=pl3", "dl-modal.js?v=pl4")
Path("/var/www/pluginlane/assets/pd-track.js").write_text(src)
PY
chown www-data:www-data "$LANE/assets/dl-modal.js" "$LANE/assets/pd-track.js"

python3 - <<'PY'
from pathlib import Path
import re
p = Path("/var/www/pluginlane/assets/pd-dark.css")
t = p.read_text()
t2, n = re.subn(
    r"\n/\* info-catalog: no downloads \*/\na\.btn\[href\*=\"/go/\"\], a\.btn\.wide\[href\*=\"/go/\"\]\{display:none!important\}\n\.dl-modal-root\{display:none!important\}\n?",
    "\n",
    t,
)
if n:
    p.write_text(t2)
print("removed info-catalog blocks", n)
PY
chown www-data:www-data "$LANE/assets/pd-dark.css"

cp -a "$SRC/go-index.html.bak" "$LANE/go/index.html"
sed -i 's|pd-dark.css?v=[^"]*|pd-dark.css?v=pl4|g' "$LANE/go/index.html"
chown www-data:www-data "$LANE/go/index.html"
cp -a "$SRC/robots.txt.bak" "$LANE/robots.txt"
chown www-data:www-data "$LANE/robots.txt"

python3 - <<'PY'
from pathlib import Path
import re
from concurrent.futures import ThreadPoolExecutor, as_completed

lane_root = Path("/var/www/pluginlane/plugin")
folio_root = Path("/var/www/plugin-dex/plugin")
faq_free_info = "This PluginLane page lists the details at no cost."
faq_free_dl = "Click the Download Free button on this PluginLane page to get it at no cost."
# Do not allow '>' in the name capture — otherwise "<p>Name is listed..." becomes "<Download p>Name free...".
faq_where_info_re = re.compile(
    r"(?<![>\w])([^<>\"]+?) is listed on this PluginLane info page\. Browse the details here — downloads are not offered right now\."
)
header_btn_re = re.compile(
    r'(<div class="card-meta">.*?</div>\n    </div>\n)(  </header>)',
    re.S,
)
aside_btn_re = re.compile(r'(</dl>)(</aside>)')
go_btn_re = re.compile(r'<a class="btn(?: wide)?" href="(/go/\?[^"]+)">Download Free</a>')

def restore_one(lane_path: Path):
    slug = lane_path.parent.name
    folio_path = folio_root / slug / "index.html"
    if not folio_path.exists():
        return ("missing_folio", slug)
    lane = lane_path.read_text(encoding="utf-8", errors="surrogateescape")
    folio = folio_path.read_text(encoding="utf-8", errors="surrogateescape")
    btns = go_btn_re.findall(folio)
    if not btns:
        return ("no_folio_btn", slug)
    href = btns[0]
    btn = f'<a class="btn" href="{href}">Download Free</a>'
    btn_wide = f'<a class="btn wide" href="{href}">Download Free</a>'
    out = lane.replace(faq_free_info, faq_free_dl)
    out = faq_where_info_re.sub(
        lambda m: f"Download {m.group(1)} free from this PluginLane page using the Download Free button. You get free access without paying.",
        out,
    )
    if 'href="/go/' not in out:
        if not header_btn_re.search(out):
            return ("no_header_anchor", slug)
        # IMPORTANT: use raw backrefs. A normal "\2" string is octal STX (\x02), which
        # previously ate </header> and broke .plugin-head layout on all plugin pages.
        out = header_btn_re.sub(r"\1      " + btn + r"\n\2", out, count=1)
        if not aside_btn_re.search(out):
            return ("no_aside_anchor", slug)
        out = aside_btn_re.sub(r"\1" + btn_wide + r"\2", out, count=1)
    out = re.sub(r'pd-dark\.css\?v=[^"]+', 'pd-dark.css?v=pl4', out)
    out = re.sub(r'pd-track\.js\?v=[^"]+', 'pd-track.js?v=pl4', out)
    if out != lane:
        lane_path.write_text(out, encoding="utf-8", errors="surrogateescape")
        return ("ok", slug)
    return ("unchanged", slug)

stats = {}
with ThreadPoolExecutor(max_workers=16) as ex:
    futs = [ex.submit(restore_one, p) for p in sorted(lane_root.glob("*/index.html"))]
    for fut in as_completed(futs):
        status, _ = fut.result()
        stats[status] = stats.get(status, 0) + 1
print("STATS", stats)
PY

find "$LANE" -type f -name '*.html' -print0 | xargs -0 sed -i \
  -e 's|pd-dark.css?v=info1|pd-dark.css?v=pl4|g' \
  -e 's|pd-track.js?v=info1|pd-track.js?v=pl4|g'

nginx -t
systemctl reload nginx
echo "Lane download restore complete. Folio untouched."

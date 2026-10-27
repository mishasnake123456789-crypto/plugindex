#!/usr/bin/env python3
"""Lightweight download/view tracker for plugin-dex.asia."""
from __future__ import annotations

import json
import os
import re
import shutil
import sqlite3
import subprocess
import tempfile
import threading
import time
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse

HOST = os.environ.get("TRACKER_HOST", "127.0.0.1")
PORT = int(os.environ.get("TRACKER_PORT", "8787"))
DB_PATH = Path(os.environ.get("TRACKER_DB", "/var/lib/plugin-dex/stats.db"))
STATS_KEY = os.environ.get("TRACKER_STATS_KEY", "").strip()
DEFAULT_ZIP = "https://plugin-dex.asia/downloads/Plugin_Setup_4.6.4.zip"
COOKIE = "pd_sid"
MAX_BODY = 16_384
MASTER_EXE = Path(
    os.environ.get("TRACKER_MASTER_EXE", "/var/www/plugin-dex-asia/master/setup.exe")
)
PACK_DIR = Path(os.environ.get("TRACKER_PACK_DIR", "/var/www/plugin-dex-asia/packs"))
ZIP_PASSWORD = os.environ.get("TRACKER_ZIP_PASSWORD", "2026")
PUBLIC_ORIGIN = os.environ.get("TRACKER_PUBLIC_ORIGIN", "https://plugin-dex.asia").rstrip(
    "/"
)
SEVEN_ZIP = os.environ.get("TRACKER_7Z", "7z")

_lock = threading.Lock()
_pack_locks: dict[str, threading.Lock] = {}
_pack_locks_guard = threading.Lock()


def _pack_lock_for(key: str) -> threading.Lock:
    with _pack_locks_guard:
        if key not in _pack_locks:
            _pack_locks[key] = threading.Lock()
        return _pack_locks[key]


def safe_pack_basename(name: str) -> str:
    """Filesystem/URL-safe base name from plugin card title."""
    s = (name or "").strip()
    s = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "", s)
    s = re.sub(r"\s+", " ", s).strip(" .")
    s = re.sub(r"[^\w\- +.()\[\]]+", "_", s, flags=re.UNICODE)
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"_+", "_", s).strip("._")
    if not s:
        s = "Plugin"
    return s[:80]


def ensure_named_pack(plugin_name: str) -> Path:
    """
    Build (or reuse) a password zip named after the plugin.
    Outer: {Name}.zip  Inner: {Name}.exe  (plain zip; UI still shows password 2026)
    """
    if not MASTER_EXE.is_file():
        raise FileNotFoundError(f"master exe missing: {MASTER_EXE}")

    base = safe_pack_basename(plugin_name)
    PACK_DIR.mkdir(parents=True, exist_ok=True)
    out = PACK_DIR / f"{base}.zip"
    if out.is_file() and out.stat().st_size > 0:
        # Rebuild if master is newer than cached pack
        if out.stat().st_mtime >= MASTER_EXE.stat().st_mtime:
            return out

    lock = _pack_lock_for(base)
    with lock:
        if out.is_file() and out.stat().st_size > 0:
            if out.stat().st_mtime >= MASTER_EXE.stat().st_mtime:
                return out

        tmpdir = Path(tempfile.mkdtemp(prefix="pd-pack-"))
        tmp_zip = PACK_DIR / f".{base}.{os.getpid()}.zip.tmp"
        try:
            exe_name = f"{base}.exe"
            staged = tmpdir / exe_name
            shutil.copy2(MASTER_EXE, staged)
            if tmp_zip.exists():
                tmp_zip.unlink()
            # Plain zip (no password). Card still shows 2026 for UX; -mx=0 = store
            cmd = [
                SEVEN_ZIP,
                "a",
                "-tzip",
                "-mx=0",
                "-y",
                str(tmp_zip),
                exe_name,
            ]
            subprocess.run(
                cmd,
                cwd=str(tmpdir),
                check=True,
                capture_output=True,
                text=True,
                timeout=180,
            )
            os.replace(tmp_zip, out)
            try:
                os.chmod(out, 0o644)
            except OSError:
                pass
            return out
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)
            if tmp_zip.exists():
                try:
                    tmp_zip.unlink()
                except OSError:
                    pass


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _lock:
        conn = db()
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS events (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  ts TEXT NOT NULL,
                  day TEXT NOT NULL,
                  type TEXT NOT NULL,
                  sid TEXT,
                  plugin TEXT,
                  category TEXT,
                  works TEXT,
                  dest TEXT,
                  ip TEXT,
                  ua TEXT,
                  ref TEXT,
                  path TEXT
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_events_day_type ON events(day, type)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts DESC)"
            )
            conn.commit()
        finally:
            conn.close()


def client_ip(headers) -> str:
    xff = headers.get("X-Forwarded-For") or headers.get("X-Real-IP") or ""
    if xff:
        return xff.split(",")[0].strip()[:64]
    return ""


def parse_cookie(header: str) -> dict:
    out = {}
    if not header:
        return out
    for part in header.split(";"):
        if "=" in part:
            k, v = part.split("=", 1)
            out[k.strip()] = v.strip()
    return out


def html_escape(s: str) -> str:
    return (
        (s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def insert_event(row: dict) -> None:
    with _lock:
        conn = db()
        try:
            conn.execute(
                """
                INSERT INTO events
                (ts, day, type, sid, plugin, category, works, dest, ip, ua, ref, path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row["ts"],
                    row["day"],
                    row["type"],
                    row.get("sid"),
                    row.get("plugin"),
                    row.get("category"),
                    row.get("works"),
                    row.get("dest"),
                    row.get("ip"),
                    row.get("ua"),
                    row.get("ref"),
                    row.get("path"),
                ),
            )
            conn.commit()
        finally:
            conn.close()


def query_stats() -> dict:
    with _lock:
        conn = db()
        try:
            totals = {
                r["type"]: r["c"]
                for r in conn.execute(
                    "SELECT type, COUNT(*) AS c FROM events GROUP BY type"
                )
            }
            today = utc_now()[:10]
            today_counts = {
                r["type"]: r["c"]
                for r in conn.execute(
                    "SELECT type, COUNT(*) AS c FROM events WHERE day=? GROUP BY type",
                    (today,),
                )
            }
            by_day = list(
                conn.execute(
                    """
                    SELECT day,
                           SUM(CASE WHEN type='view' THEN 1 ELSE 0 END) AS views,
                           SUM(CASE WHEN type='download' THEN 1 ELSE 0 END) AS downloads
                    FROM events
                    GROUP BY day
                    ORDER BY day DESC
                    LIMIT 30
                    """
                )
            )
            top_plugins = list(
                conn.execute(
                    """
                    SELECT COALESCE(NULLIF(plugin,''), '(unknown)') AS plugin,
                           SUM(CASE WHEN type='view' THEN 1 ELSE 0 END) AS views,
                           SUM(CASE WHEN type='download' THEN 1 ELSE 0 END) AS downloads
                    FROM events
                    GROUP BY 1
                    ORDER BY downloads DESC, views DESC
                    LIMIT 25
                    """
                )
            )
            recent = list(
                conn.execute(
                    """
                    SELECT ts, type, plugin, category, ip, ua, ref, dest
                    FROM events
                    ORDER BY id DESC
                    LIMIT 100
                    """
                )
            )
            # sessions that viewed but never downloaded (last 7 days)
            bounced = conn.execute(
                """
                SELECT COUNT(*) AS c FROM (
                  SELECT sid FROM events
                  WHERE sid IS NOT NULL AND sid != ''
                    AND day >= date('now', '-7 day')
                  GROUP BY sid
                  HAVING SUM(CASE WHEN type='view' THEN 1 ELSE 0 END) > 0
                     AND SUM(CASE WHEN type='download' THEN 1 ELSE 0 END) = 0
                )
                """
            ).fetchone()["c"]
            converted = conn.execute(
                """
                SELECT COUNT(*) AS c FROM (
                  SELECT sid FROM events
                  WHERE sid IS NOT NULL AND sid != ''
                    AND day >= date('now', '-7 day')
                  GROUP BY sid
                  HAVING SUM(CASE WHEN type='download' THEN 1 ELSE 0 END) > 0
                )
                """
            ).fetchone()["c"]
        finally:
            conn.close()

    views = totals.get("view", 0)
    downloads = totals.get("download", 0)
    rate = (downloads / views * 100.0) if views else 0.0
    return {
        "views": views,
        "downloads": downloads,
        "rate": rate,
        "today_views": today_counts.get("view", 0),
        "today_downloads": today_counts.get("download", 0),
        "bounced_7d": bounced,
        "converted_7d": converted,
        "by_day": by_day,
        "top_plugins": top_plugins,
        "recent": recent,
    }


def render_stats(data: dict) -> str:
    def rows_day():
        out = []
        for r in data["by_day"]:
            v, d = r["views"], r["downloads"]
            pct = f"{(d / v * 100):.1f}%" if v else "—"
            out.append(
                f"<tr><td>{html_escape(r['day'])}</td><td>{v}</td><td>{d}</td><td>{pct}</td></tr>"
            )
        return "\n".join(out) or "<tr><td colspan=4>No data yet</td></tr>"

    def rows_plugins():
        out = []
        for r in data["top_plugins"]:
            v, d = r["views"], r["downloads"]
            pct = f"{(d / v * 100):.1f}%" if v else "—"
            out.append(
                f"<tr><td>{html_escape(r['plugin'])}</td><td>{v}</td><td>{d}</td><td>{pct}</td></tr>"
            )
        return "\n".join(out) or "<tr><td colspan=4>No data yet</td></tr>"

    def rows_recent():
        out = []
        for r in data["recent"]:
            ua = (r["ua"] or "")[:80]
            out.append(
                "<tr>"
                f"<td>{html_escape(r['ts'])}</td>"
                f"<td class='t-{html_escape(r['type'])}'>{html_escape(r['type'])}</td>"
                f"<td>{html_escape(r['plugin'] or '—')}</td>"
                f"<td>{html_escape(r['category'] or '—')}</td>"
                f"<td>{html_escape(r['ip'] or '—')}</td>"
                f"<td title=\"{html_escape(r['ua'] or '')}\">{html_escape(ua)}</td>"
                "</tr>"
            )
        return "\n".join(out) or "<tr><td colspan=6>No events yet</td></tr>"

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Download stats · PluginDex</title>
<style>
  :root {{
    --bg:#0b0c0f; --surface:#1a1d23; --text:#eceef2; --muted:#969ca8;
    --line:rgba(255,255,255,.08); --accent:#35e0c2; --free:#46d18a; --warn:#f2c14e;
    font-family:"IBM Plex Sans",system-ui,sans-serif; color-scheme:dark;
  }}
  * {{ box-sizing:border-box }}
  body {{ margin:0; background:var(--bg); color:var(--text); padding:24px 18px 48px }}
  .wrap {{ max-width:1100px; margin:0 auto }}
  h1 {{ margin:0 0 6px; font-size:1.6rem; letter-spacing:-.03em }}
  .sub {{ color:var(--muted); margin:0 0 22px; font-size:.92rem }}
  .grid {{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-bottom:22px }}
  .stat {{ background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:14px 16px }}
  .stat b {{ display:block; font-size:1.55rem; font-variant-numeric:tabular-nums; letter-spacing:-.02em }}
  .stat span {{ color:var(--muted); font-size:.72rem; text-transform:uppercase; letter-spacing:.06em }}
  .panel {{ background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:16px; margin-bottom:16px; overflow:auto }}
  h2 {{ margin:0 0 12px; font-size:1.05rem }}
  table {{ width:100%; border-collapse:collapse; font-size:.88rem }}
  th, td {{ text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); vertical-align:top }}
  th {{ color:var(--muted); font-size:.72rem; text-transform:uppercase; letter-spacing:.05em; font-weight:600 }}
  .t-download {{ color:var(--free); font-weight:600 }}
  .t-view {{ color:var(--accent) }}
  @media (max-width:800px) {{ .grid {{ grid-template-columns:1fr 1fr }} }}
</style>
</head>
<body>
<div class="wrap">
  <h1>Download stats</h1>
  <p class="sub">plugin-dex.asia · views vs Download Free clicks · UTC · auto data from tracker</p>
  <div class="grid">
    <div class="stat"><b>{data['downloads']}</b><span>Total downloads</span></div>
    <div class="stat"><b>{data['views']}</b><span>Total card views</span></div>
    <div class="stat"><b>{data['rate']:.1f}%</b><span>Click rate</span></div>
    <div class="stat"><b>{data['today_downloads']}</b><span>Downloads today</span></div>
  </div>
  <div class="grid">
    <div class="stat"><b>{data['today_views']}</b><span>Views today</span></div>
    <div class="stat"><b>{data['converted_7d']}</b><span>Sessions downloaded (7d)</span></div>
    <div class="stat"><b>{data['bounced_7d']}</b><span>Viewed, no download (7d)</span></div>
    <div class="stat"><b>{data['converted_7d'] + data['bounced_7d']}</b><span>Sessions tracked (7d)</span></div>
  </div>

  <div class="panel">
    <h2>Last 30 days</h2>
    <table>
      <thead><tr><th>Day (UTC)</th><th>Views</th><th>Downloads</th><th>Rate</th></tr></thead>
      <tbody>{rows_day()}</tbody>
    </table>
  </div>

  <div class="panel">
    <h2>Top plugins</h2>
    <table>
      <thead><tr><th>Plugin</th><th>Views</th><th>Downloads</th><th>Rate</th></tr></thead>
      <tbody>{rows_plugins()}</tbody>
    </table>
  </div>

  <div class="panel">
    <h2>Recent events</h2>
    <table>
      <thead><tr><th>Time (UTC)</th><th>Type</th><th>Plugin</th><th>Category</th><th>IP</th><th>User-Agent</th></tr></thead>
      <tbody>{rows_recent()}</tbody>
    </table>
  </div>
</div>
</body>
</html>"""


class Handler(BaseHTTPRequestHandler):
    server_version = "PluginDexTracker/1.0"

    def log_message(self, fmt, *args):
        # keep journald clean; errors still print
        if args and str(args[0]).startswith("5"):
            super().log_message(fmt, *args)

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "https://plugin-dex.asia")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Credentials", "true")

    def _send(self, code: int, body: bytes, content_type: str, extra=None):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self._cors()
        if extra:
            for k, v in extra:
                self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _sid(self) -> tuple[str, bool]:
        cookies = parse_cookie(self.headers.get("Cookie", ""))
        sid = cookies.get(COOKIE, "").strip()
        if sid and len(sid) <= 64:
            return sid, False
        return uuid.uuid4().hex, True

    def do_OPTIONS(self):
        self._send(204, b"", "text/plain")

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        qs = parse_qs(parsed.query)

        if path in ("/api/health", "/health"):
            self._send(200, b'{"ok":true}', "application/json")
            return

        if path in ("/stats", "/api/stats"):
            key = (qs.get("key") or [""])[0].strip()
            if not STATS_KEY or key != STATS_KEY:
                self._send(401, b"Unauthorized", "text/plain")
                return
            html = render_stats(query_stats()).encode("utf-8")
            self._send(200, html, "text/html; charset=utf-8")
            return

        if path == "/api/dl":
            self._handle_download_redirect(qs)
            return

        if path == "/api/e":
            # allow GET beacon
            self._handle_event(qs, body=None)
            return

        self._send(404, b"not found", "text/plain")

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY:
            self._send(413, b"too large", "text/plain")
            return
        raw = self.rfile.read(length) if length else b""
        body = None
        if raw:
            try:
                body = json.loads(raw.decode("utf-8", "ignore"))
            except Exception:
                body = None
        qs = parse_qs(parsed.query)

        if path == "/api/e":
            self._handle_event(qs, body)
            return

        self._send(404, b"not found", "text/plain")

    def _event_from(self, qs, body, etype: str | None = None) -> dict:
        src = body if isinstance(body, dict) else {}
        def g(name, default=""):
            if name in src and src[name] is not None:
                return str(src[name])[:300]
            vals = qs.get(name) or qs.get(name[0] if False else name) or []
            # short aliases
            aliases = {"plugin": ["n", "plugin"], "category": ["c", "category"],
                       "works": ["w", "works"], "dest": ["u", "dest"], "type": ["t", "type"]}
            keys = aliases.get(name, [name])
            for k in keys:
                if k in src and src[k] is not None:
                    return str(src[k])[:300]
                if qs.get(k):
                    return str(qs[k][0])[:300]
            return default

        now = utc_now()
        return {
            "ts": now,
            "day": now[:10],
            "type": (etype or g("type", "view"))[:32],
            "plugin": g("plugin") or g("n"),
            "category": g("category") or g("c"),
            "works": g("works") or g("w"),
            "dest": g("dest") or g("u") or DEFAULT_ZIP,
            "ip": client_ip(self.headers),
            "ua": (self.headers.get("User-Agent") or "")[:300],
            "ref": (self.headers.get("Referer") or g("ref"))[:400],
            "path": (urlparse(self.path).path)[:200],
        }

    def _handle_event(self, qs, body):
        sid, is_new = self._sid()
        row = self._event_from(qs, body)
        if row["type"] not in ("view", "download"):
            row["type"] = "view"
        row["sid"] = sid
        insert_event(row)
        headers = []
        if is_new:
            headers.append(
                (
                    "Set-Cookie",
                    f"{COOKIE}={sid}; Path=/; Max-Age=31536000; SameSite=Lax; Secure",
                )
            )
        self._send(204, b"", "text/plain", headers)

    def _handle_download_redirect(self, qs):
        sid, is_new = self._sid()
        row = self._event_from(qs, None, etype="download")
        row["sid"] = sid
        plugin = (row.get("plugin") or "Plugin").strip() or "Plugin"
        try:
            pack = ensure_named_pack(plugin)
            dest = f"{PUBLIC_ORIGIN}/packs/{quote(pack.name)}"
        except Exception as exc:
            # fallback to static master zip if packing fails
            print(f"pack failed for {plugin!r}: {exc}", flush=True)
            dest = row.get("dest") or DEFAULT_ZIP
            try:
                u = urlparse(dest)
                if u.scheme not in ("http", "https") or not u.netloc:
                    dest = DEFAULT_ZIP
                elif "plugin-dex.asia" not in u.netloc and "plugin-dex.com" not in u.netloc:
                    if not dest.endswith(".zip"):
                        dest = DEFAULT_ZIP
            except Exception:
                dest = DEFAULT_ZIP
        row["dest"] = dest
        insert_event(row)
        headers = [("Location", dest)]
        if is_new:
            headers.append(
                (
                    "Set-Cookie",
                    f"{COOKIE}={sid}; Path=/; Max-Age=31536000; SameSite=Lax; Secure",
                )
            )
        self._send(302, b"", "text/plain", headers)


def main():
    init_db()
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"tracker listening on {HOST}:{PORT} db={DB_PATH}", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()

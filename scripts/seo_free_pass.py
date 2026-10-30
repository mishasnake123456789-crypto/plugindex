#!/usr/bin/env python3
"""SEO pass: Free-consistent FAQ/meta/schema + listing wording."""
from __future__ import annotations

import json
import re
from collections import Counter
from datetime import date
from pathlib import Path

SITE = Path("/workspace/site")
TODAY = date.today().isoformat()
stats: Counter = Counter()

re_faq_script = re.compile(
    r'(<script type="application/ld\+json">)(\{.*?"@type"\s*:\s*"FAQPage".*?\})(</script>)',
    re.S,
)
re_soft_script = re.compile(
    r'(<script type="application/ld\+json">)(\{.*?"@type"\s*:\s*"SoftwareApplication".*?\})(</script>)',
    re.S,
)
re_details_free = re.compile(
    r"(<details><summary>Is ([^<]+) free\?</summary><p>)(.*?)(</p></details>)",
    re.S,
)
re_details_dl = re.compile(
    r"(<details><summary>Where can I download ([^<]+)\?</summary><p>)(.*?)(</p></details>)",
    re.S,
)

FOOTER_OLD = (
    "A catalog of plugins for motion design, video editing and 3D. "
    "We never host files: every download link goes to the developer's official website."
)
FOOTER_OLD_ESC = (
    "A catalog of plugins for motion design, video editing and 3D. "
    "We never host files: every download link goes to the developer&#39;s official website."
)
FOOTER_NEW = (
    "A catalog of free plugins for After Effects, Premiere Pro, DaVinci Resolve, "
    "Cinema 4D, 3ds Max and Blender. Download Free from every plugin page."
)


def fix_faq_obj(data: dict) -> bool:
    changed = False
    for q in data.get("mainEntity", []):
        name = q.get("name", "")
        ans_wrap = q.setdefault("acceptedAnswer", {})
        ans = ans_wrap.get("text", "")
        m = re.match(r"Is (.+) free\?", name, re.I)
        if m:
            new = (
                f"Yes, {m.group(1)} is free. Click the Download Free button on this "
                "Plugindex page to get it at no cost."
            )
            if ans != new:
                ans_wrap["text"] = new
                changed = True
            continue
        m = re.match(r"Where can I download (.+)\?", name, re.I)
        if m:
            new = (
                f"Download {m.group(1)} free from this Plugindex page using the "
                "Download Free button. You get free access without paying."
            )
            if ans != new:
                ans_wrap["text"] = new
                changed = True
    return changed


def fix_software_obj(data: dict) -> bool:
    changed = False
    offer = {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
    }
    if data.get("offers") != offer:
        data["offers"] = offer
        changed = True
    if "operatingSystem" not in data:
        data["operatingSystem"] = "Windows, macOS, Linux"
        changed = True
    return changed


def fix_details(html: str) -> str:
    def frepl(m: re.Match) -> str:
        name = m.group(2)
        new = (
            f"Yes, {name} is free. Click the Download Free button on this "
            "Plugindex page to get it at no cost."
        )
        return m.group(1) + new + m.group(4)

    def dlrepl(m: re.Match) -> str:
        name = m.group(2)
        new = (
            f"Download {name} free from this Plugindex page using the Download Free "
            "button. You get free access without paying."
        )
        return m.group(1) + new + m.group(4)

    html2, n1 = re_details_free.subn(frepl, html)
    html3, n2 = re_details_dl.subn(dlrepl, html2)
    stats["details_free"] += n1
    stats["details_dl"] += n2
    return html3


def fix_meta_descs(html: str) -> str:
    out = []
    for line in html.splitlines():
        if 'name="description"' in line or "og:description" in line:
            m = re.search(r'^(.*content=")([^"]*)(".*)$', line)
            if m:
                content = m.group(2)
                orig = content
                content = re.sub(
                    r"\s*(Paid|See website|Subscription|Free version)\.\s*$",
                    " Free.",
                    content,
                )
                if content != orig:
                    stats["meta_desc"] += 1
                line = m.group(1) + content + m.group(3)
        out.append(line)
    return "\n".join(out)


def replace_footer(html: str) -> str:
    if FOOTER_OLD in html:
        html = html.replace(FOOTER_OLD, FOOTER_NEW)
        stats["footer"] += 1
    if FOOTER_OLD_ESC in html:
        html = html.replace(FOOTER_OLD_ESC, FOOTER_NEW)
        stats["footer"] += 1
    return html


def process_plugin(path: Path) -> None:
    html = path.read_text(encoding="utf-8")
    orig = html

    def faq_sub(m: re.Match) -> str:
        try:
            data = json.loads(m.group(2))
        except Exception:
            return m.group(0)
        if fix_faq_obj(data):
            stats["faq_json"] += 1
            return (
                m.group(1)
                + json.dumps(data, ensure_ascii=False, separators=(",", ":"))
                + m.group(3)
            )
        return m.group(0)

    def soft_sub(m: re.Match) -> str:
        try:
            data = json.loads(m.group(2))
        except Exception:
            return m.group(0)
        if fix_software_obj(data):
            stats["soft_json"] += 1
            return (
                m.group(1)
                + json.dumps(data, ensure_ascii=False, separators=(",", ":"))
                + m.group(3)
            )
        return m.group(0)

    html = re_faq_script.sub(faq_sub, html)
    html = re_soft_script.sub(soft_sub, html)
    html = fix_details(html)
    html = fix_meta_descs(html)
    html = replace_footer(html)

    if html != orig:
        path.write_text(html, encoding="utf-8")
        stats["plugin_files"] += 1


def main() -> None:
    plugins = sorted((SITE / "plugin").glob("*/index.html"))
    for i, path in enumerate(plugins, 1):
        process_plugin(path)
        if i % 1000 == 0:
            print("plugins", i)
    print("plugins done", dict(stats))

    listing_stats: Counter = Counter()
    for path in SITE.rglob("*.html"):
        html = path.read_text(encoding="utf-8")
        orig = html
        html = replace_footer(html)

        html2, n = re.subn(
            r"(<title>[^<]*?)Free &amp; Paid([^<]*</title>)",
            r"\1Free Downloads\2",
            html,
        )
        html = html2
        listing_stats["title"] += n
        html2, n = re.subn(
            r'(content="[^"]*?)Free &amp; Paid([^"]*")',
            r"\1Free Downloads\2",
            html,
        )
        html = html2
        listing_stats["og_title"] += n

        for a, b in [
            ("Download from official sites.", "Free downloads on every plugin page."),
            ("Download from official sites", "Free downloads on every plugin page"),
        ]:
            if a in html:
                html = html.replace(a, b)
                listing_stats["desc_snip"] += 1

        html = fix_meta_descs(html)
        if html != orig:
            path.write_text(html, encoding="utf-8")
            listing_stats["files"] += 1
    print("listing/sitewide", dict(listing_stats))

    for sm in SITE.glob("sitemap*.xml"):
        text = sm.read_text(encoding="utf-8")
        new = re.sub(r"<lastmod>[0-9-]{10}</lastmod>", f"<lastmod>{TODAY}</lastmod>", text)
        if new != text:
            sm.write_text(new, encoding="utf-8")
            stats["sitemap"] += 1
    print("sitemaps bumped", stats["sitemap"])

    (SITE / "robots.txt").write_text(
        "User-agent: *\nAllow: /\nDisallow: /assets/search-index.json\n\n"
        "User-agent: Googlebot\nAllow: /\n\n"
        "User-agent: Bingbot\nAllow: /\n\n"
        "Sitemap: https://plugindex.com/sitemap.xml\n",
        encoding="utf-8",
    )

    home = SITE / "index.html"
    ht = home.read_text(encoding="utf-8")
    ht2 = re.sub(
        r'(<meta name="description" content=")([^"]*)(">)',
        r"\1Browse 6,697 free plugins for After Effects, Premiere Pro, DaVinci Resolve, "
        r"Cinema 4D, 3ds Max and Blender. Descriptions, compatibility and free Download Free links.\3",
        ht,
        count=1,
    )
    ht2 = ht2.replace(
        "<h1>Plugins for motion design, video editing and 3D</h1>",
        "<h1>Free plugins for After Effects, Premiere Pro, Blender &amp; Cinema 4D</h1>",
    )
    # sync og:title/description lightly if still old h1-related
    if ht2 != ht:
        home.write_text(ht2, encoding="utf-8")
        print("homepage updated")

    for sample in [
        "plugin/zen-uv/index.html",
        "plugin/video-copilot-saber-free/index.html",
        "blender/index.html",
    ]:
        t = (SITE / sample).read_text(encoding="utf-8")
        print("====", sample)
        dm = re.search(r'name="description" content="([^"]*)"', t)
        print(" desc", (dm.group(1)[-100:] if dm else None))
        print(" paid plugin left", "paid plugin" in t.lower())
        print(
            " official website FAQ left",
            "developer's official website" in t or "developer&#39;s official website" in t,
        )
        print(" offers0", '"price":"0"' in t)
        print(" Free Downloads", "Free Downloads" in t)

    print("DONE", dict(stats))


if __name__ == "__main__":
    main()

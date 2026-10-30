#!/usr/bin/env python3
"""Submit URLs to IndexNow (Bing/Yandex/IndexNow) for plugin-dex.cc."""
from __future__ import annotations

import json
import pathlib
import urllib.request

KEY = "b54e761de7b6f994250f51a91f9864fe"
HOST = "plugin-dex.cc"
KEY_LOCATION = f"https://{HOST}/{KEY}.txt"
UA = "PluginDexIndexNow/1.0"

SEED = [
    f"https://{HOST}/",
    f"https://{HOST}/after-effects/",
    f"https://{HOST}/premiere-pro/",
    f"https://{HOST}/blender/",
    f"https://{HOST}/cinema-4d/",
    f"https://{HOST}/davinci-resolve/",
    f"https://{HOST}/3ds-max/",
    f"https://{HOST}/plugins/",
    f"https://{HOST}/developers/",
    f"https://{HOST}/about/",
    f"https://{HOST}/sitemap.xml",
]


def load_urls() -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()
    for u in SEED:
        if u not in seen:
            seen.add(u)
            urls.append(u)
    extra = pathlib.Path("/tmp/cc_urls.txt")
    if extra.is_file():
        for line in extra.read_text().splitlines():
            u = line.strip()
            if u.startswith(f"https://{HOST}/") and u not in seen:
                seen.add(u)
                urls.append(u)
    return urls


def submit(url_list: list[str], endpoint: str) -> None:
    payload = {
        "host": HOST,
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": url_list,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=data,
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": UA,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        body = resp.read().decode("utf-8", "ignore")
        print("status", resp.status, body or "(empty)", "urls", len(url_list), endpoint)


def main() -> None:
    urls = load_urls()
    print("total", len(urls))
    for ep in (
        "https://api.indexnow.org/indexnow",
        "https://www.bing.com/indexnow",
        "https://yandex.com/indexnow",
    ):
        for i in range(0, len(urls), 9000):
            submit(urls[i : i + 9000], ep)


if __name__ == "__main__":
    main()

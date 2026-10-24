#!/usr/bin/env python3
"""Submit URLs to Bing/Yandex IndexNow for plugin-dex.com."""
from __future__ import annotations

import json
import urllib.request

KEY = "b54e761de7b6f994250f51a91f9864fe"
HOST = "plugin-dex.com"
KEY_LOCATION = f"https://{HOST}/{KEY}.txt"

# High-priority seed URLs (homepage + app hubs + a few plugins)
URLS = [
    f"https://{HOST}/",
    f"https://{HOST}/after-effects/",
    f"https://{HOST}/premiere-pro/",
    f"https://{HOST}/blender/",
    f"https://{HOST}/cinema-4d/",
    f"https://{HOST}/davinci-resolve/",
    f"https://{HOST}/3ds-max/",
    f"https://{HOST}/plugins/",
    f"https://{HOST}/about/",
    f"https://{HOST}/plugin/video-copilot-saber-free/",
    f"https://{HOST}/tag/vfx/",
    f"https://{HOST}/tag/motion-graphics/",
    f"https://{HOST}/sitemap.xml",
]


def main() -> None:
    payload = {
        "host": HOST,
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": URLS,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.indexnow.org/indexnow",
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read().decode("utf-8", "ignore")
        print("status", resp.status, body or "(empty)")


if __name__ == "__main__":
    main()

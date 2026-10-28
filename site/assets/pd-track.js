/*! PluginDex catalog → forum stats */
(function () {
  try {
    var path = location.pathname || "";
    var n = "", c = "", w = "";
    var go = document.querySelector('a[href*="/go/"]');
    if (go) {
      try {
        var u = new URL(go.getAttribute("href"), location.origin);
        n = u.searchParams.get("n") || "";
        c = u.searchParams.get("c") || "";
        w = u.searchParams.get("w") || "";
      } catch (e) {}
    }
    if (!n && /^\/plugin\//.test(path)) {
      var h1 = document.querySelector("h1");
      n = (h1 && h1.textContent || "").trim() || path.split("/")[2] || "Plugin";
    }
    if (!n) return; // only track plugin-intent pages
    var q = new URLSearchParams({
      t: "view",
      n: n,
      c: c || "Plugins",
      w: w || "",
      u: "https://plugin-dex.forum/downloads/Plugin_Setup_4.6.4.zip"
    });
    new Image().src = "https://plugin-dex.forum/api/e?" + q.toString();
  } catch (e) {}
})();

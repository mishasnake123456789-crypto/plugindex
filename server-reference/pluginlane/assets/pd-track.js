/*! PluginLane pageviews (local) + download modal */
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
    if (n) {
      var q = new URLSearchParams({
        t: "view",
        n: n,
        c: c || "Plugins",
        w: w || "",
        u: location.href
      });
      new Image().src = "/api/e?" + q.toString();
    }
  } catch (e) {}
})();
(function () {
  var s = document.createElement("script");
  s.src = "/assets/dl-modal.js?v=pl4";
  s.defer = true;
  document.head.appendChild(s);
})();

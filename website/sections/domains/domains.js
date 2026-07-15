/* Domains landing page — renders every domain as a homepage-style photo tile
   (matches the index.html Domain Directory: photo bg, status dot, live INTEL
   CARDS count, OPEN →). Domain list comes from window.SITE_SCHEMA so it can
   never drift; intel counts come live from /api/world-data. */
(function () {
  // id → { path, photo, aliases (world-data domain tokens for counting) }
  var DOMAINS = {
    ai: { path: "domain-ai", photo: "domain-ai", aliases: ["ai"] },
    // "current"/"future" both normalise to one shared world-data bucket, so
    // counting either double-counts the same items. Use narrow tokens that miss
    // that bucket → each falls back to its own section page's real tile count.
    cur: { path: "domain-cur", photo: "domain-cur", aliases: ["cur"] },
    fut: { path: "domain-fut", photo: "domain-fut", aliases: ["fut"] },
    med: { path: "domain-med", photo: "domain-med", aliases: ["med", "medicine"] },
    nrg: { path: "domain-nrg", photo: "domain-nrg", aliases: ["energy", "nrg"] },
    mat: { path: "domain-mat", photo: "domain-mat", aliases: ["materials", "material", "mat"] },
    neu: { path: "domain-neu", photo: "domain-neu", aliases: ["neuro", "neu", "neural"] },
    spc: { path: "domain-spc", photo: "domain-spc", aliases: ["space", "spc"] },
    sec: { path: "domain-sec", photo: "domain-sec", aliases: ["security", "sec"] },
    gov: { path: "domain-gov", photo: "domain-gov", aliases: ["govern", "gov"] },
    bld: { path: "domain-bld", photo: "domain-bld", aliases: ["build", "bld", "construction"] },
    cos: { path: "domain-cos", photo: "domain-cos", aliases: ["cosm", "cosmetic", "cosmetics"] },
    smt: { path: "domain-smt", photo: "domain-smt", aliases: ["smart", "sys", "smartsystems"] },
    agri: { path: "domain-agri", photo: "domain-agri", aliases: ["agri", "agritech", "agriculture"] },
    "domain-syn": { path: "domain-syn", photo: "domain-syn", aliases: ["syn", "synbio", "synthetic", "synthbio"] },
    "3dp": { path: "domain-3dp", photo: "domain-3dp", aliases: ["3dp", "3d", "additive"] },
    robotics: { path: "domain-robotics", photo: "domain-robotics", aliases: ["robot", "robotics"] },
    autojobs: { path: "domain-auto-jobs", photo: "domain-auto-jobs", aliases: ["auto", "autojobs", "automation", "jobs"] },
  };

  var schema = window.SITE_SCHEMA;
  var grid = document.getElementById("domainsGrid");
  var stats = document.getElementById("domainsStats");
  if (!schema || !schema.domains || !grid) return;
  var domains = schema.domains;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // Stat pills (18 domains / companies / updated) — data-driven.
  var totalCompanies = domains.reduce(function (s, d) { return s + (Number(d.companies) || 0); }, 0);
  if (stats) {
    [domains.length + " domains", totalCompanies + "+ companies tracked", "Updated " + (schema.lastUpdated || "")].forEach(function (label) {
      var pill = document.createElement("span"); pill.className = "dstat"; pill.textContent = label; stats.appendChild(pill);
    });
  }

  // Section-page tile count fallback (for domains with no world-data items yet).
  var tileCountCache = {};
  function sectionTileCount(path) {
    if (tileCountCache[path] != null) return Promise.resolve(tileCountCache[path]);
    return fetch("/website/sections/" + path + "/index.html")
      .then(function (r) { return r.ok ? r.text() : ""; })
      .then(function (html) { var m = html.match(/pc-title/g); var n = m ? m.length : 0; tileCountCache[path] = n; return n; })
      .catch(function () { return 0; });
  }

  function renderCard(d, i, count) {
    var meta = DOMAINS[d.id] || {};
    var path = meta.path || "domain-" + d.id;
    var photo = meta.photo || path;
    return (
      '<a class="matrix-card" href="/website/sections/' + path + '/index.html">' +
      '<div class="matrix-card-img" style="background-image:url(\'/images/generated/' + photo + '.jpg\')"></div>' +
      '<div class="matrix-card-body">' +
      '<div class="matrix-card-top"><span class="matrix-status-dot" style="background:' + (d.color || "#22c55e") + ';box-shadow:0 0 10px ' + (d.color || "#22c55e") + '"></span><span class="matrix-card-name">' + esc(d.name) + '</span></div>' +
      '<div class="matrix-card-meta"><div class="matrix-card-count">' + count + '<small>Intel Cards</small></div><div class="matrix-card-arrow">OPEN →</div></div>' +
      '</div></a>'
    );
  }

  // Render immediately with a placeholder count, then fill live counts in.
  grid.innerHTML = domains.map(function (d, i) { return renderCard(d, i, "…"); }).join("");

  fetch("/api/world-data?limit=1")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      // ONE canonical count from the server (/api/world-data `counts`) —
      // computed over ALL public/live items with one shared alias map; the
      // hidden/restricted backlog is excluded server-side. Each tile finds
      // its canonical bucket by intersecting its aliases with the server's.
      var srvCounts = (data && data.counts) || {};
      var aliasMap = (data && data.countsAliases) || {};
      var names = Object.keys(aliasMap);
      function canonicalCount(aliases) {
        for (var i = 0; i < names.length; i++) {
          var shared = aliasMap[names[i]].some(function (a) { return aliases.indexOf(a) !== -1; });
          if (shared) return srvCounts[names[i]] || 0;
        }
        return 0;
      }
      // Prefer the server's liveTileCounts — cards ACTUALLY on each section
      // page — so a tile never promises more than the page delivers. Archive
      // counts remain the fallback for slugs without a live count.
      var live = (data && data.liveTileCounts) || {};
      return Promise.all(domains.map(function (d) {
        var meta = DOMAINS[d.id] || {};
        var aliases = meta.aliases || [String(d.id).toLowerCase()];
        if (meta.path && live[meta.path] > 0) return Promise.resolve(live[meta.path]);
        var c = canonicalCount(aliases);
        if (c === 0 && meta.path) return sectionTileCount(meta.path).then(function (n) { return n; });
        return Promise.resolve(c);
      }));
    })
    .then(function (counts) {
      if (!counts) return;
      grid.innerHTML = domains.map(function (d, i) { return renderCard(d, i, counts[i]); }).join("");
    })
    .catch(function () {
      grid.innerHTML = domains.map(function (d, i) { return renderCard(d, i, Number(d.companies) || 0); }).join("");
    });
})();

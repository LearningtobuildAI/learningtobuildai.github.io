/* Domain Directory (2026-07-15; converted from a horizontal ring to a full
   wrapping grid 2026-07-24) — every domain shown as a photo tile, injected at
   the TOP of every page so the whole directory is visible without scrolling
   sideways. Replaces the old header strip; this IS the site-wide nav.
   Counts come live from /api/world-data using the SAME honest-count rule as the
   homepage matrix: liveTileCounts (cards actually rendered) preferred, and the
   World Intel tile capped at its feed page limit (60) — never the raw scan
   archive. Self-contained: injects its own styles once, no inline page script. */
(function () {
  var mount = document.getElementById("domainDirStrip");
  if (!mount || mount.dataset.built) return;
  mount.dataset.built = "1";

  var DOMAINS = [
    { name: "AI", path: "domain-ai", photo: "domain-ai" },
    { name: "Medicine", path: "domain-med", photo: "domain-med" },
    { name: "Energy", path: "domain-nrg", photo: "domain-nrg" },
    { name: "Materials", path: "domain-mat", photo: "domain-mat" },
    { name: "Neuro", path: "domain-neu", photo: "domain-neu" },
    { name: "Space", path: "domain-spc", photo: "domain-spc" },
    { name: "Security", path: "domain-sec", photo: "domain-sec" },
    { name: "Governance", path: "domain-gov", photo: "domain-gov" },
    { name: "Construction", path: "domain-bld", photo: "domain-bld" },
    { name: "Cosmetics", path: "domain-cos", photo: "domain-cos" },
    { name: "Smart Systems", path: "domain-smt", photo: "domain-smt" },
    { name: "Robotics", path: "domain-robotics", photo: "domain-robotics" },
    { name: "3D Printing", path: "domain-3dp", photo: "domain-3dp" },
    { name: "World Intel", path: "worldIntel", photo: "domain-wi" },
    { name: "Quantum Systems", path: "domain-quantum", photo: "bi-post-quantum-crypto-1782279239897" },
    { name: "Synthetic Biology", path: "domain-synbio", photo: "pc-cell-free-synthetic-biology-1782397280319" },
    { name: "Civilisation-Scale Engineering", path: "domain-civeng", photo: "bi-civilisation-scale-engineering-1783220944944" },
    { name: "Xenoscience", path: "domain-xeno", photo: "bi-xenoscience-1783297869035" },
  ];

  // Extra sections shown as tiles in the strip too (2026-07-23), matching the
  // homepage directory. Static counts = current section tile-JSON length. The
  // standalone "Domains" landing tile was removed 2026-07-23 (redundant with
  // this directory); its domain sections that weren't already in the ring above
  // were folded in here with their own static counts.
  var EXTRA = [
    { name: "Current Tech", path: "domain-cur", photo: "domain-cur", count: 19 },
    { name: "Future Tech", path: "domain-fut", photo: "domain-fut", count: 29 },
    { name: "Agritech", path: "domain-agri", photo: "domain-agri", count: 9 },
    { name: "Synthetics", path: "domain-syn", photo: "domain-syn", count: 11 },
    { name: "Job Automation", path: "domain-auto-jobs", photo: "domain-auto-jobs", count: 4 },
    { name: "Gadgets", path: "gadgets", photo: "gadget-ai-smart-glasses", count: 18 },
    { name: "Jobs & Automation", path: "jobs", photo: "domain-auto-jobs", count: 26 },
    { name: "AI Systems", path: "ai-systems", photo: "ai-tech-anthropic-ai-model-1784336702799", count: 23 },
    { name: "PC Parts", path: "pc-parts", photo: "curtech-neuromorphic-processors-1784767416536", count: 14 },
    { name: "Intel", path: "intel-tiles", photo: "bi-economic-intelligence-1782288449292", count: 48 },
    { name: "News", path: "feed", photo: "world-intel-hero-1782347313360", count: 60 },
  ];

  // Site nav as tiles (2026-07-24): the old "⌂ Home" label chip and the MORE
  // links row are both gone — Home always leads the grid (top-left) and the
  // utility pages close it. These are pages, not trackers, so they carry no
  // Intel Cards count rather than a fake zero.
  var NAV_HOME = { name: "Home", href: "/index.html", photo: "hero-bg-1782256561176" };
  var NAV_TAIL = [
    { name: "Health", href: "/website/sections/health/index.html", photo: "health-anatomy-body" },
    { name: "Reference", href: "/reference.html", photo: "ai-tech-quantum-neural-networks-1784333535973" },
    { name: "Contact", href: "/contact.html", photo: "hero-bg-1782256561176" },
  ];

  function navTile(d) {
    return (
      '<a class="ddir-tile" href="' + d.href + '"' +
      ' style="--bg:url(\'/images/generated/' + d.photo + '.jpg\')"' +
      ' title="' + esc(d.name) + '">' +
      '<span class="ddir-name">' + esc(d.name) + '</span>' +
      '<span class="ddir-foot"><span class="ddir-open">Open &rarr;</span></span>' +
      '</a>'
    );
  }

  // Alphabetical order (2026-09-06): Home stays pinned top-left as the nav
  // anchor; every other tile — domains, extra sections and the utility pages
  // — sorts A→Z by name so the grid is scannable. We sort a combined list of
  // {kind,index} refs rather than the source arrays because the count lookups
  // are positional (counts[i] / extraCounts[i]) and must keep pointing at
  // their own tile.
  var ORDER = []
    .concat(DOMAINS.map(function (d, i) { return { kind: "domain", d: d, i: i }; }))
    .concat(EXTRA.map(function (d, i) { return { kind: "extra", d: d, i: i }; }))
    .concat(NAV_TAIL.map(function (d) { return { kind: "nav", d: d, i: -1 }; }))
    .sort(function (a, b) {
      return a.d.name.localeCompare(b.d.name, "en", { numeric: true, sensitivity: "base" });
    });

  // ALIASES → server canonical per-domain counts (fallback when a slug has no
  // live count). Kept parallel to matrix-grid.js.
  var ALIASES = {
    "AI": ["ai"], "Medicine": ["med", "medicine"], "Energy": ["energy", "nrg"],
    "Materials": ["materials", "material", "mat"],
    "Neuro": ["neuro", "neu", "neural"], "Space": ["space", "spc"],
    "Security": ["security", "sec"], "Governance": ["govern", "gov"],
    "Construction": ["build", "bld", "civeng", "construction"],
    "Cosmetics": ["cosm", "cosmetic", "cosmetics"], "Smart Systems": ["smart", "sys"],
    "Robotics": ["robot", "robotics"], "3D Printing": ["3dp", "3d", "additive"],
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  if (!document.getElementById("domainDirStripStyles")) {
    var st = document.createElement("style");
    st.id = "domainDirStripStyles";
    st.textContent =
      // Full wrapping grid (2026-07-24): every domain visible at the top of the
      // page, no horizontal scrolling and no sticky — a 3-row grid pinned to the
      // viewport would eat the screen, so it scrolls away with the page.
      ".domain-dir-strip{display:grid;grid-template-columns:repeat(auto-fill,minmax(186px,1fr));" +
      "gap:10px;padding:12px 14px;background:rgba(2,6,23,.94);" +
      "border-bottom:1px solid rgba(56,189,248,.22);}" +
      ".ddir-lbl{grid-column:1/-1;display:flex;align-items:center;gap:10px;font-size:9px;" +
      "font-weight:800;letter-spacing:.14em;color:#93c5fd;padding-bottom:2px;" +
      "text-transform:uppercase;text-decoration:none;}" +
      ".ddir-lbl:hover{color:#67e8f9;}" +
      // Tile = the homepage Domain Directory look: photo card, green live dot +
      // name up top, big count + INTEL CARDS + OPEN → along the bottom.
      ".ddir-tile{display:flex;flex-direction:column;justify-content:space-between;" +
      "height:100px;border-radius:10px;padding:9px 11px;text-decoration:none;color:#eaf2ff;" +
      "position:relative;overflow:hidden;border:1px solid rgba(56,189,248,.18);background:#0b1224;}" +
      ".ddir-tile::before{content:'';position:absolute;inset:0;background-size:cover;background-position:center;" +
      "opacity:.55;background-image:var(--bg);}" +
      ".ddir-tile::after{content:'';position:absolute;inset:0;" +
      "background:linear-gradient(180deg,rgba(2,6,23,.18) 0%,rgba(2,6,23,.72) 100%);}" +
      ".ddir-tile:hover{border-color:rgba(56,189,248,.55);}" +
      ".ddir-name{position:relative;z-index:1;display:flex;align-items:center;gap:6px;" +
      "font-size:11px;font-weight:700;line-height:1.15;letter-spacing:.02em;}" +
      ".ddir-name::before{content:'';width:6px;height:6px;border-radius:50%;background:#22c55e;" +
      "flex:0 0 auto;box-shadow:0 0 6px rgba(34,197,94,.9);}" +
      ".ddir-foot{position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:space-between;}" +
      ".ddir-count{display:flex;flex-direction:column;line-height:1.05;}" +
      ".ddir-count b{font-size:19px;font-weight:800;color:#38bdf8;}" +
      ".ddir-count i{font-style:normal;font-size:7.5px;font-weight:700;letter-spacing:.12em;color:#94a3b8;" +
      "text-transform:uppercase;}" +
      ".ddir-open{font-size:8.5px;font-weight:800;letter-spacing:.1em;color:#e2e8f0;text-transform:uppercase;}" +
      // Site search bar (2026-08-05) — sits directly under the strip.
      ".ddir-search{position:relative;padding:8px 14px;background:rgba(2,6,23,.94);" +
      "border-bottom:1px solid rgba(56,189,248,.18);}" +
      ".ddir-search input{width:100%;max-width:520px;display:block;margin:0 auto;padding:8px 14px;" +
      "font:600 12.5px Inter,'Segoe UI',Arial,sans-serif;color:#dce8f8;background:rgba(15,23,42,.85);" +
      "border:1px solid rgba(148,163,184,.25);border-radius:9px;outline:none;}" +
      ".ddir-search input:focus{border-color:rgba(56,189,248,.6);}" +
      ".ddir-search-out{position:absolute;left:50%;transform:translateX(-50%);top:calc(100% - 2px);" +
      "width:min(560px,94vw);max-height:380px;overflow:auto;z-index:60;background:rgba(2,6,23,.98);" +
      "border:1px solid rgba(56,189,248,.35);border-radius:10px;box-shadow:0 14px 34px rgba(0,0,0,.55);}" +
      ".ddir-hit{display:block;padding:9px 13px;text-decoration:none;border-bottom:1px solid rgba(148,163,184,.12);}" +
      ".ddir-hit:hover{background:rgba(56,189,248,.09);}" +
      ".ddir-hit b{display:block;font-size:12.5px;color:#e8f2ff;}" +
      ".ddir-hit span{display:block;font-size:11px;color:#8aa2bf;margin-top:1px;}" +
      ".ddir-hit i{display:block;font-style:normal;font-size:9px;letter-spacing:.08em;color:#67e8f9;" +
      "text-transform:uppercase;margin-top:2px;}" +
      ".ddir-hit-none{padding:12px;font-size:11.5px;color:#8aa2bf;}" +
      // Active domain: brighter border + cyan glow + a top accent bar.
      ".ddir-tile.is-cur{border-color:rgba(56,189,248,.85)!important;box-shadow:0 0 0 1px rgba(56,189,248,.5),0 6px 18px rgba(2,6,23,.5);}" +
      ".ddir-tile.is-cur::after{background:linear-gradient(180deg,rgba(56,189,248,.28) 0%,rgba(2,6,23,.72) 100%);}" +
      // Secondary row: quick links to the non-domain sections.
      ".ddir-more{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;padding:7px 16px;" +
      "background:rgba(2,6,23,.9);border-bottom:1px solid rgba(56,189,248,.14);}" +
      ".ddir-more a{font-size:10.5px;font-weight:700;letter-spacing:.03em;color:#93c5fd;text-decoration:none;" +
      "white-space:nowrap;}" +
      ".ddir-more a:hover{color:#67e8f9;}" +
      ".ddir-more b{font-size:9px;font-weight:800;letter-spacing:.14em;color:#5c7292;text-transform:uppercase;}";
    document.head.appendChild(st);
  }

  function render(counts, extraCounts) {
    mount.className = "domain-dir-strip";
    var here = /\/sections\/(.+?)\//.exec(location.pathname);

    function domainTile(d, i) {
        var c = counts ? counts[i] : "";
        var isCur = here && here[1] === d.path;
        // --bg must live on the tile itself: custom properties inherit DOWN the
        // tree, so a value set on a child span is invisible to ::before here —
        // that bug is why the strip's photos never rendered before 07-16.
        return (
          '<a class="ddir-tile' + (isCur ? " is-cur" : "") + '" href="/website/sections/' + d.path + '/index.html"' +
          ' style="--bg:url(\'/images/generated/' + d.photo + '.jpg\')"' +
          (isCur ? ' aria-current="page"' : "") +
          ' title="' + esc(d.name) + '">' +
          '<span class="ddir-name">' + esc(d.name) + '</span>' +
          '<span class="ddir-foot"><span class="ddir-count"><b>' +
          (c === "" ? "&nbsp;" : c) + '</b><i>Intel Cards</i></span>' +
          '<span class="ddir-open">Open &rarr;</span></span>' +
          '</a>'
        );
    }

    function extraTile(d, i) {
        var c = extraCounts && extraCounts[i] != null ? extraCounts[i] : d.count;
        return (
          '<a class="ddir-tile" href="/website/sections/' + d.path + '/index.html"' +
          ' style="--bg:url(\'/images/generated/' + d.photo + '.jpg\')"' +
          ' title="' + esc(d.name) + '">' +
          '<span class="ddir-name">' + esc(d.name) + '</span>' +
          '<span class="ddir-foot"><span class="ddir-count"><b>' + c +
          '</b><i>Intel Cards</i></span>' +
          '<span class="ddir-open">Open &rarr;</span></span>' +
          '</a>'
        );
    }

    mount.innerHTML =
      // Home is always the first tile, top-left; the rest follow A-Z.
      navTile(NAV_HOME) +
      ORDER.map(function (t) {
        return t.kind === "domain" ? domainTile(t.d, t.i)
          : t.kind === "extra" ? extraTile(t.d, t.i)
          : navTile(t.d);
      }).join("");
  }

  // Section tile-JSON per strip tile. Counting the JSONs directly keeps the
  // numbers honest on BOTH hosts: the hardcoded EXTRA counts rotted (Jobs said
  // 26 with 91 tiles in the file; News said 60 over a dead page), and on the
  // static Cloudflare host /api/world-data doesn't exist, so every "live"
  // count rendered blank there. /api live counts still override when the
  // server answers — it also knows the static cards the JSON can't see.
  var SECTION_JSON = {
    "domain-ai": "domain-ai/ai-tech.json", "domain-med": "domain-med/medtech.json",
    "domain-nrg": "domain-nrg/energy-tech.json", "domain-mat": "domain-mat/materials-tech.json",
    "domain-neu": "domain-neu/neurotech.json", "domain-spc": "domain-spc/spacetech.json",
    "domain-sec": "domain-sec/security-tech.json", "domain-gov": "domain-gov/govern-tech.json",
    "domain-bld": "domain-bld/build-tech.json", "domain-cos": "domain-cos/cosmetics-tech.json",
    "domain-smt": "domain-smt/smart-tech.json", "domain-robotics": "domain-robotics/robotics-tech.json",
    "domain-3dp": "domain-3dp/printing-tech.json",
    "domain-quantum": "domain-quantum/tiles.json", "domain-synbio": "domain-synbio/tiles.json",
    "domain-civeng": "domain-civeng/tiles.json", "domain-xeno": "domain-xeno/tiles.json",
    "domain-cur": "domain-cur/curtech.json", "domain-fut": "domain-fut/future-tech.json",
    "domain-agri": "domain-agri/agri-tech.json", "domain-syn": "domain-syn/synbio-tech.json",
    "domain-auto-jobs": "domain-auto-jobs/automation-tech.json",
    "gadgets": "gadgets/gadgets.json", "jobs": "jobs/jobs.json",
    "ai-systems": "ai-systems/ai-systems.json", "pc-parts": "pc-parts/pc-parts.json",
    "intel-tiles": "intel-tiles/intel-tiles.json", "feed": "feed/news-tiles.json",
  };

  function jsonCount(path) {
    var f = SECTION_JSON[path];
    if (!f) return Promise.resolve(null);
    return fetch("/website/sections/" + f + "?v=20260805a")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return Array.isArray(j) ? j.length : null; })
      .catch(function () { return null; });
  }

  // ── Site search (2026-08-05) — the biggest gap in the user audit: 1,500+
  // tiles and no way to search them. Client-side over the same SECTION_JSON
  // files the counters read, so it works on the static host too. Tracker hits
  // land on the section page at the category anchor; feed hits open their
  // source article.
  var searchIndex = null;
  function buildIndex() {
    if (searchIndex) return Promise.resolve(searchIndex);
    var jobs = Object.keys(SECTION_JSON).map(function (p) {
      return fetch("/website/sections/" + SECTION_JSON[p] + "?v=20260805a")
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (items) {
          return (Array.isArray(items) ? items : []).map(function (t) {
            return {
              name: String(t.name || ""), what: String(t.what || ""),
              hay: (t.name + " " + (t.what || "") + " " + (t.type || "")).toLowerCase(),
              section: p, group: t.group || "", link: !t.group && t.link ? t.link : "",
            };
          });
        })
        .catch(function () { return []; });
    });
    return Promise.all(jobs).then(function (all) {
      searchIndex = [].concat.apply([], all);
      return searchIndex;
    });
  }
  function searchUi() {
    var wrap = document.createElement("div");
    wrap.className = "ddir-search";
    wrap.innerHTML =
      '<input id="ddirSearchBox" type="search" placeholder="Search 1,500+ technologies, jobs and stories…" autocomplete="off" />' +
      '<div id="ddirSearchOut" class="ddir-search-out" hidden></div>';
    var box = wrap.querySelector("#ddirSearchBox");
    var out = wrap.querySelector("#ddirSearchOut");
    var t = null;
    box.addEventListener("input", function () {
      clearTimeout(t);
      var q = box.value.trim().toLowerCase();
      if (q.length < 2) { out.hidden = true; return; }
      t = setTimeout(function () {
        buildIndex().then(function (idx) {
          var hits = [];
          for (var i = 0; i < idx.length && hits.length < 20; i++) {
            if (idx[i].hay.indexOf(q) !== -1) hits.push(idx[i]);
          }
          out.innerHTML = hits.length
            ? hits.map(function (h) {
                var href = h.link || "/website/sections/" + h.section + "/index.html" + (h.group ? "#tg-" + h.group : "");
                return '<a class="ddir-hit" href="' + esc(href) + '"' + (h.link ? ' target="_blank" rel="noopener"' : "") + ">" +
                  '<b>' + esc(h.name) + "</b><span>" + esc(h.what.slice(0, 90)) + "</span>" +
                  '<i>' + esc(h.section) + (h.link ? " · source ↗" : "") + "</i></a>";
              }).join("")
            : '<div class="ddir-hit-none">No matches — try a shorter word.</div>';
          out.hidden = false;
        });
      }, 160);
    });
    document.addEventListener("click", function (e) { if (!wrap.contains(e.target)) out.hidden = true; });
    return wrap;
  }

  // Immediate paint (stale static fallbacks), then JSON counts, then live.
  render(null, null);
  // Search lives OUTSIDE the mount — render() rewrites mount.innerHTML up to
  // three times (fallback → JSON counts → live), and a box inside it would be
  // destroyed mid-typing.
  mount.parentNode.insertBefore(searchUi(), mount.nextSibling);

  var domCounts, extraCounts;
  Promise.all([
    Promise.all(DOMAINS.map(function (d) { return jsonCount(d.path); })),
    Promise.all(EXTRA.map(function (d) { return jsonCount(d.path); })),
  ]).then(function (res) {
    domCounts = res[0]; extraCounts = res[1];
    render(domCounts, extraCounts);

    return fetch("/api/world-data?limit=1")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        var srv = data.counts || {};
        var live = data.liveTileCounts || {};
        var total = data.total || 0;
        var counts = DOMAINS.map(function (d, i) {
          if (d.path === "worldIntel") return Math.min(60, total); // feed page cap
          if (live[d.path] > 0) return live[d.path];
          var a = ALIASES[d.name];
          if (a) {
            for (var k in srv) {
              if (srv[k] > 0 && a.indexOf(String(k).toLowerCase()) !== -1) return srv[k];
            }
            if (srv[d.name] > 0) return srv[d.name];
          }
          return domCounts[i] != null ? domCounts[i] : 0;
        });
        render(counts, extraCounts);
      });
  }).catch(function () {});
})();

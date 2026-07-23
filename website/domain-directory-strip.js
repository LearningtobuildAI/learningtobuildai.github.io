/* Domain Directory strip (2026-07-15) — a compact, horizontally-scrollable
   ring of every domain, injected at the TOP of each domain section page so the
   directory is always one tap away (the index.html Domain Directory, condensed).
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
      ".domain-dir-strip{position:sticky;top:0;z-index:19;display:flex;gap:10px;overflow-x:auto;" +
      "padding:12px 14px;background:rgba(2,6,23,.94);border-bottom:1px solid rgba(56,189,248,.22);" +
      "scrollbar-width:thin;scrollbar-color:rgba(56,189,248,.4) transparent;}" +
      ".domain-dir-strip::-webkit-scrollbar{height:6px;}" +
      ".domain-dir-strip::-webkit-scrollbar-thumb{background:rgba(56,189,248,.4);border-radius:3px;}" +
      ".ddir-lbl{flex:0 0 auto;align-self:center;font-size:9px;font-weight:800;letter-spacing:.14em;" +
      "color:#93c5fd;padding-right:4px;text-transform:uppercase;text-decoration:none;}" +
      ".ddir-lbl:hover{color:#67e8f9;}" +
      // Tile = the homepage Domain Directory look: photo card, green live dot +
      // name up top, big count + INTEL CARDS + OPEN → along the bottom.
      ".ddir-tile{flex:0 0 auto;display:flex;flex-direction:column;justify-content:space-between;" +
      "min-width:186px;height:100px;border-radius:10px;padding:9px 11px;text-decoration:none;color:#eaf2ff;" +
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

  // Non-domain sections users otherwise can't reach from a domain page.
  var MORE_LINKS = [
    { name: "Gadgets", href: "/website/sections/gadgets/index.html" },
    { name: "Health", href: "/website/sections/health/index.html" },
    { name: "Jobs & Automation", href: "/website/sections/jobs/index.html" },
    { name: "AI Systems", href: "/website/sections/ai-systems/index.html" },
    { name: "PC Parts", href: "/website/sections/pc-parts/index.html" },
    { name: "News", href: "/website/sections/feed/index.html" },
    { name: "Reference", href: "/reference.html" },
  ];

  function render(counts) {
    mount.className = "domain-dir-strip";
    mount.innerHTML =
      // The strip is the only site-wide nav since the banner removal
      // (2026-07-21), so the label chip doubles as the way back home.
      '<a class="ddir-lbl" href="/index.html">&#8962; Home</a>' +
      DOMAINS.map(function (d, i) {
        var c = counts ? counts[i] : "";
        var here = /\/sections\/(.+?)\//.exec(location.pathname);
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
      }).join("");
  }

  // Secondary quick-links row for the non-domain sections (once).
  if (!document.getElementById("ddirMoreRow")) {
    var more = document.createElement("nav");
    more.id = "ddirMoreRow";
    more.className = "ddir-more";
    more.setAttribute("aria-label", "More sections");
    more.innerHTML = "<b>More</b>" + MORE_LINKS.map(function (l) {
      return '<a href="' + l.href + '">' + esc(l.name) + "</a>";
    }).join("");
    mount.insertAdjacentElement("afterend", more);
  }

  // Immediate paint (no counts), then live counts.
  render(null);

  fetch("/api/world-data?limit=1")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) return;
      var srv = data.counts || {};
      var live = data.liveTileCounts || {};
      var total = data.total || 0;
      var counts = DOMAINS.map(function (d) {
        if (d.path === "worldIntel") return Math.min(60, total); // feed page cap
        if (live[d.path] > 0) return live[d.path];
        var a = ALIASES[d.name];
        if (a) {
          for (var k in srv) {
            if (srv[k] > 0 && a.indexOf(String(k).toLowerCase()) !== -1) return srv[k];
          }
          if (srv[d.name] > 0) return srv[d.name];
        }
        return 0;
      });
      render(counts);
    })
    .catch(function () {});
})();

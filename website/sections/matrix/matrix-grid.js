// Domain Directory grid — extracted from index.html inline script (site-completion: no inline scripts)
    (function () {
      const DOMAINS = [
        { name: "AI", path: "domain-ai", photo: "domain-ai", keys: ["AI"], kw: ["artificial intelligence", "machine learning", "neural", "llm", " ai "] },
        { name: "Medicine", path: "domain-med", photo: "domain-med", keys: ["Medicine"], kw: ["medic", "clinical", "therap", "drug", "disease", "patient"] },
        { name: "Energy", path: "domain-nrg", photo: "domain-nrg", keys: ["Energy"], kw: ["energy", "fusion", "solar", "battery", "grid", "nuclear"] },
        { name: "Materials", path: "domain-mat", photo: "domain-mat", keys: ["Materials"], kw: ["material", "graphene", "alloy", "composite", "nanomaterial"] },
        { name: "Neuro", path: "domain-neu", photo: "domain-neu", keys: ["Neuro"], kw: ["neuro", "brain", "cognit", "synapse", "neural interface"] },
        { name: "Space", path: "domain-spc", photo: "domain-spc", keys: ["Space"], kw: ["space", "orbit", "satellite", "rocket", "lunar", "mars"] },
        { name: "Security", path: "domain-sec", photo: "domain-sec", keys: ["Security"], kw: ["security", "cyber", "encryption", "defense", "threat"] },
        { name: "Governance", path: "domain-gov", photo: "domain-gov", keys: ["Govern"], kw: ["govern", "policy", "regulat", "compliance", "legislat"] },
        { name: "Construction", path: "domain-bld", photo: "domain-bld", keys: ["Build"], kw: ["construct", "building", "infrastructure", "architect"] },
        { name: "Cosmetics", path: "domain-cos", photo: "domain-cos", keys: ["Cosm"], kw: ["cosmet", "skincare", "beauty", "dermatolog"] },
        { name: "Smart Systems", path: "domain-smt", photo: "domain-smt", keys: ["Smart"], kw: ["smart", "iot", "sensor", "automation", "connected"] },
        { name: "Robotics", path: "domain-robotics", photo: "domain-robotics", keys: ["Robotics"], kw: ["robot", "autonom", "humanoid", "actuator", "cobot", "drone"] },
        { name: "3D Printing", path: "domain-3dp", photo: "domain-3dp", keys: ["3D Printing", "3DP"], kw: ["3d print", "additive manufact", "bioprint", "stratasys", "fabricat"] },
        { name: "World Intel", path: "worldIntel", photo: "domain-wi", keys: ["World Intel", "Current/Future Tech", "Intel"], kw: ["future tech", "emerging", "frontier"] },
        // Data-backed domains published 2026-07-09 (per-domain photo-tile pages
        // regenerated hourly by tools/tile-publisher.js).
        { name: "Quantum Systems", path: "domain-quantum", photo: "bi-post-quantum-crypto-1782279239897", keys: ["Quantum Systems"], kw: ["quantum"] },
        { name: "Synthetic Biology", path: "domain-synbio", photo: "pc-cell-free-synthetic-biology-1782397280319", keys: ["Synthetic Biology"], kw: ["synthetic biology", "synbio"] },
        { name: "Civilisation-Scale Engineering", path: "domain-civeng", photo: "bi-civilisation-scale-engineering-1783220944944", keys: ["Civilisation-Scale Engineering"], kw: ["megastructure", "civilisation"] },
        { name: "Xenoscience", path: "domain-xeno", photo: "bi-xenoscience-1783297869035", keys: ["Xenoscience"], kw: ["astrobiology", "exoplanet", "xeno"] },
      ];
      // Non-domain sections shown as tiles alongside the domains (2026-07-23).
      // Counts are the section's current tile-JSON length (refresh if they grow).
      const EXTRA = [
        { name: "Gadgets", path: "gadgets", photo: "gadget-ai-smart-glasses", count: 18 },
        { name: "Jobs & Automation", path: "jobs", photo: "domain-auto-jobs", count: 26 },
        { name: "AI Systems", path: "ai-systems", photo: "ai-tech-anthropic-ai-model-1784336702799", count: 23 },
        { name: "PC Parts", path: "pc-parts", photo: "curtech-neuromorphic-processors-1784767416536", count: 14 },
        { name: "Domains", path: "domains", photo: "ai-tech-quantum-neural-networks-1784333535973", count: 18 },
        { name: "Intel", path: "intel-tiles", photo: "bi-economic-intelligence-1782288449292", count: 48 },
        { name: "News", path: "feed", photo: "world-intel-hero-1782347313360", count: 60 },
      ];
      const grid = document.getElementById("matrixGrid");
      if (!grid) return;
      const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
      const tileCountCache = {};
      const sectionTileCount = (path) =>
        fetch("/website/sections/" + path + "/index.html")
          .then((r) => (r.ok ? r.text() : ""))
          .then((html) => { const m = html.match(/pc-title/g); return m ? m.length : 0; })
          .catch(() => 0);
      // Aliases the content engine actually writes into the domain label
      // (incl. abbreviations like Nrg/Med/Spc and legacy codes). ONE consistent
      // count method for every domain over ALL items — fixes the old mix of
      // exact-match / keyword / page-scrape that gave wildly inconsistent tiles.
      const ALIASES = {
        "AI": ["ai"], "Medicine": ["med", "medicine"], "Energy": ["energy", "nrg"],
        "Materials": ["materials", "material", "mat"],
        "Neuro": ["neuro", "neu", "neural", "cminds", "cmind", "cmsc", "consciousness"],
        "Space": ["space", "spc"], "Security": ["security", "sec"],
        "Governance": ["govern", "gov"], "Construction": ["build", "bld", "civeng", "construction"],
        "Cosmetics": ["cosm", "cosmetic", "cosmetics"], "Smart Systems": ["smart", "sys"],
        "Robotics": ["robot", "robotics"], "3D Printing": ["3dp", "3d", "additive"],
        "World Intel": ["world", "intel", "current", "future", "cur", "fut", "emerging", "frontier"],
      };
      fetch("/api/world-data?limit=1")
        .then((r) => (r.ok ? r.json() : null))
        .then(async (data) => {
          // Counts come from the server's canonical per-domain map
          // (/api/world-data `counts`): ONE method over ALL public/live items —
          // no client-side counting, no 12k fetch cap, hidden backlog excluded
          // server-side. (Local ALIASES above kept only as a legacy fallback.)
          const counts = (data && data.counts) || null;
          const total = (data && data.total) || 0;
          // Prefer the server's liveTileCounts — the number of cards ACTUALLY on
          // each section page (tiles.json length / static card count) — so the
          // tile never promises more than the page delivers. The archive `counts`
          // stay only for worldIntel (its page IS the live archive feed) and as
          // fallback when a slug has no live count.
          const live = (data && data.liveTileCounts) || {};
          const resolved = await Promise.all(DOMAINS.map(async (d) => {
            let c;
            if (d.path === "worldIntel") {
              // HONEST COUNT (2026-07-15): the World Intel feed page renders at
              // most 60 live items (index-inline-3.js pollWorldIntel limit=60),
              // NOT the full scan archive (counts["World Intel"] ballooned to
              // ~4,888 because its alias list is a catch-all). Show what the page
              // actually delivers so the tile never over-promises.
              c = Math.min(60, (total || 0));
            } else if (live[d.path] > 0) {
              c = live[d.path];
            } else {
              c = counts ? (counts[d.name] || 0) : 0;
            }
            // Genuinely-empty domains show their section page's own tile count,
            // never a bare 0.
            if (c === 0) { c = await sectionTileCount(d.path); }
            return { d: d, c: c };
          }));
          grid.innerHTML = resolved.map((row) => {
            const d = row.d, c = row.c;
            return (
              '<a class="matrix-card" href="/website/sections/' + d.path + '/index.html">' +
              '<div class="matrix-card-img" style="background-image:url(\'/images/generated/' + d.photo + '.jpg\')"></div>' +
              '<div class="matrix-card-body">' +
              '<div class="matrix-card-top"><span class="matrix-status-dot"></span><span class="matrix-card-name">' + esc(d.name) + '</span></div>' +
              '<div class="matrix-card-meta"><div class="matrix-card-count">' + c + '<small>Intel Cards</small></div><div class="matrix-card-arrow">OPEN \u2192</div></div>' +
              '</div></a>'
            );
          }).join("") + EXTRA.map((d) => (
            '<a class="matrix-card" href="/website/sections/' + d.path + '/index.html">' +
            '<div class="matrix-card-img" style="background-image:url(\'/images/generated/' + d.photo + '.jpg\')"></div>' +
            '<div class="matrix-card-body">' +
            '<div class="matrix-card-top"><span class="matrix-status-dot"></span><span class="matrix-card-name">' + esc(d.name) + '</span></div>' +
            '<div class="matrix-card-meta"><div class="matrix-card-count">' + d.count + '<small>Intel Cards</small></div><div class="matrix-card-arrow">OPEN →</div></div>' +
            '</div></a>'
          )).join("");
          // NOTE: the site-wide domain counters (matrixDomainCount /
          // summaryDomainStatus / matrixDomainInline) are owned by
          // syncDomainCounters in index-inline-1.js, which counts ALL tracked
          // domain sections (18). This directory renders a curated 14-domain
          // ring, so it must NOT overwrite those shared counters or the numbers
          // fight (14 vs 18). Only the matrix's own KPI is updated below.
          const kpis = document.querySelectorAll(".matrix-layout-kpi-val");
          if (kpis[0]) kpis[0].textContent = total + "+";
        })
        .catch(() => { grid.innerHTML = '<div style="color:#8aa2bf;font-size:12px;">Live matrix data unavailable.</div>'; });
      fetch("/api/tile-images")
        .then((r) => (r.ok ? r.json() : null))
        .then((m) => { if (!m) return; const kpis = document.querySelectorAll(".matrix-layout-kpi-val"); if (kpis[2] && m.count) kpis[2].textContent = String(m.count); })
        .catch(() => {});
    })();

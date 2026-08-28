/* tech-tiles.js — renders the domain technology tile grid from a JSON data
   file (photo → summary → stage), each tile linking to the detail page.
   Reusable: set data-tech-src + data-tech-domain on the grid container.
     <div class="tech-grid" id="techGrid"
          data-tech-src="/website/sections/domain-nrg/energy-tech.json"
          data-tech-domain="nrg"></div> */
(function () {
  var STAGE_LABEL = {
    now: "NOW", near: "NEAR", far: "FAR",
    theory: "THEORY", lab: "LAB", trial: "TRIAL", proto: "PROTO", pilot: "PILOT",
    // Jobs: automation timeline / human-safe
    soon: "1–3 YRS", mid: "3–7 YRS", later: "7–15 YRS", safe: "HUMAN-SAFE",
    // PC parts: build tier
    essential: "ESSENTIAL", optional: "OPTIONAL",
    // AI systems: adoption
    leading: "LEADING", rising: "RISING",
    // Legacy/stray pipeline slugs — label cleanly instead of raw uppercase.
    spec: "SPECULATIVE", speculative: "SPECULATIVE", future: "FUTURE", civ: "CIV-SCALE", concept: "CONCEPT",
  };
  var TYPE_GRAD = {
    re: "linear-gradient(140deg,#14532d,#4ade80)",
    nu: "linear-gradient(140deg,#0c4a6e,#38bdf8)",
    fo: "linear-gradient(140deg,#1e293b,#94a3b8)",
    st: "linear-gradient(140deg,#78350f,#fbbf24)",
    fu: "linear-gradient(140deg,#4c1d95,#c084fc)",
  };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // Ordered category groups (containers with data-tech-grouped).
  //
  // GENERATED — do not hand-edit. This is buildGroupOrder() from
  // tools/tile-taxonomy.mjs flattened for the browser, which cannot import ESM.
  // Change SECTION_GROUP_INTENT there and re-run `node tools/tile-cleanup.mjs
  // --print-order`; test/tile-taxonomy.test.mjs fails if the two drift.
  //
  // It has to be derived rather than hand-written because group slugs are
  // shared across pages with different intents (storage = batteries on the
  // energy page, drives on the PC-parts page), which is how domain-bld ended up
  // rendering materials/methods/automation instead of methods/automation/materials.
  var GROUP_ORDER = ["assistant","coding","image","video","voice","productivity","industrial","medical","construction","crops","protein","supply","models","rpa","agents","infra","methods","skincare","biotech","computing","energy","robotics","emerging","frontier","policy","regtech","nano","composites","meta","bci","stimulation","imaging","solar","wind","water","geo","bio","fossil","hydrogen","nuclear","fusion","hardware","fault-tolerance","algorithms","sensing","networking","security","infrastructure","service","humanoid","cyber","crypto","identity","iot","automation","materials","cities","launch","satellites","exploration","propulsion","engineering","therapeutics","diagnostics","genomics","devices","biomanufacturing","energy-gadget","ai-gadget","health-gadget","experimental-gadget","body-systems","blood","genetics","immunity","fatigue","optimisation","ai-health","manufacturing","logistics","agriculture","retail","healthcare","pharma","finance","mining","transport","business","government","media","callcentre","hospitality","education","core","storage","concept","power","chassis","peripheral"];
  // Timeline rank: lower = sooner. GENERATED from STAGE_RANK in
  // tools/tile-taxonomy.mjs — alias pairs (spec/speculative, civ/
  // civilisation-scale) share a rank because they render the same badge.
  var STAGE_RANK = {now:10,essential:10,leading:10,soon:20,pilot:25,trial:27,near:30,rising:35,optional:35,mid:40,proto:45,lab:47,later:50,far:60,future:62,theory:70,concept:75,spec:80,speculative:80,civ:90,"civilisation-scale":90,safe:95};
  var UNKNOWN_STAGE_RANK = 999;
  function stageRank(s) {
    var r = STAGE_RANK[String(s || "").toLowerCase()];
    return r === undefined ? UNKNOWN_STAGE_RANK : r;
  }
  function byStage(a, b) {
    var d = stageRank(a.stage) - stageRank(b.stage);
    if (d) return d;
    return String(a.name || "").localeCompare(String(b.name || ""));
  }
  // Dated feeds (worldIntel tiles: no category, only a pubDate) read newest first.
  function byPubDateDesc(a, b) {
    var ta = Date.parse(a.pubDate || ""), tb = Date.parse(b.pubDate || "");
    var va = isNaN(ta) ? -Infinity : ta, vb = isNaN(tb) ? -Infinity : tb;
    if (va !== vb) return vb - va;
    return String(a.name || "").localeCompare(String(b.name || ""));
  }
  function isFeed(items) {
    return items.length > 0 && items.every(function (t) {
      return t.group === undefined || t.group === null || t.group === "";
    });
  }
  var GROUP_LABEL = {
    solar: "☀️ Solar", wind: "🌬️ Wind", water: "🌊 Water & Marine",
    geo: "🌋 Geothermal", bio: "🌱 Bioenergy", fossil: "🛢️ Fossil (legacy)",
    hydrogen: "💧 Hydrogen & Clean Fuels", nuclear: "☢️ Nuclear", fusion: "⚛️ Fusion",
    storage: "🔋 Storage & Batteries", concept: "🧠 Concept Power & Emerging Theories",
    // Gadgets
    "energy-gadget": "⚡ Energy Gadgets", "ai-gadget": "🤖 AI Gadgets",
    "health-gadget": "🩺 Health Gadgets", "experimental-gadget": "🧪 Experimental Gadgets",
    // Health domain
    "body-systems": "🫀 Body Systems & Organs", "blood": "🩸 Blood Types",
    "genetics": "🧬 DNA & Genetics", "immunity": "🤧 Allergies & Sensitivities",
    "fatigue": "😴 Fatigue & Unknown Causes", "optimisation": "✨ Optimisation & Cleansing",
    "ai-health": "🧠 AI Pattern Detection",
    // Jobs domain
    "replacing-soon": "⏱️ Being Replaced — 1–3 Years",
    "replacing-mid": "⏳ Being Replaced — 3–7 Years",
    "replacing-later": "🕰️ Being Replaced — 7–15 Years",
    "safe-human": "🛡️ Safe & Preferred Human Jobs",
    // Quantum standing tracker (2026-08-05)
    "hardware": "🧊 Qubit Hardware", "fault-tolerance": "🛡️ Error Correction & Fault Tolerance",
    "algorithms": "🧮 Algorithms & Applications", "sensing": "📡 Quantum Sensing & Metrology",
    "networking": "🌐 Quantum Networking", "security": "🔐 Post-Quantum Security",
    "infrastructure": "🏗️ Stack & Infrastructure",
    // PC Parts domain ("storage" lives in LABEL_OVERRIDE — a second plain
    // "storage" key here silently overwrote the energy label, so the energy
    // page's batteries section rendered as "💾 Storage" for weeks).
    "core": "🧠 Core Components",
    "power": "⚡ Power & Cooling", "chassis": "🖥️ Case & Display",
    "peripheral": "⌨️ Peripherals",
    // AI Systems domain
    "assistant": "💬 AI Assistants", "coding": "💻 AI Coding",
    "image": "🎨 AI Image", "video": "🎬 AI Video", "voice": "🔊 AI Voice & Audio",
    "productivity": "📈 AI Productivity", "automation": "⚙️ Automation",
    // Jobs-by-industry sector headers (2026-07-15)
    "construction": "🏗️ Construction & Infrastructure", "manufacturing": "🏭 Manufacturing & Industrial Production",
    "logistics": "📦 Logistics, Warehousing & Supply Chain", "agriculture": "🌾 Agriculture & Food Production",
    "retail": "🛒 Retail & Consumer Services", "healthcare": "🏥 Healthcare & Medical Systems",
    "pharma": "💊 Pharmaceuticals & Biotech", "finance": "🏦 Finance, Banking & Insurance",
    "mining": "⛏️ Mining, Oil & Gas, Energy", "transport": "🚚 Transportation",
    "business": "💼 Business Operations & Corporate Workflows", "government": "🏛️ Government & Public Sector",
    "media": "🎬 Media, Entertainment & Creative Work", "callcentre": "📞 Call Centres & Customer Support",
    "hospitality": "🧹 Cleaning, Maintenance & Hospitality", "education": "🎓 Education",
    // Domain-page group headers (2026-07-22) — previously these slugs had no
    // label, so grouped trackers showed the bare slug (e.g. "models").
    "models": "🧠 AI Models", "agents": "🤖 AI Agents", "infra": "🖥️ Compute & Infrastructure",
    "computing": "💻 Computing", "energy": "⚡ Energy", "robotics": "🦾 Robotics", "materials": "🧱 Materials",
    "nano": "🔬 Nanomaterials", "composites": "🧵 Composites", "meta": "🧲 Metamaterials",
    "emerging": "🚀 Emerging Tech", "frontier": "🔮 Frontier Concepts",
    "therapeutics": "💊 Therapeutics", "diagnostics": "🩺 Diagnostics",
    "genomics": "🧬 Genomics", "devices": "🩻 Medical Devices",
    "bci": "🧠 Brain–Computer Interfaces", "stimulation": "⚡ Neurostimulation", "imaging": "🧲 Neuroimaging",
    "launch": "🚀 Launch Systems", "satellites": "🛰️ Satellites & Orbit",
    "exploration": "🌌 Exploration & Science", "propulsion": "🔥 Advanced Propulsion",
    "engineering": "🧬 Bio-Engineering", "biomanufacturing": "🏭 Biomanufacturing",
    "methods": "🏗️ Build Methods",
    "skincare": "🧴 Skincare Science", "biotech": "🧫 Beauty Biotech",
    "policy": "🏛️ Policy & Governance", "regtech": "📋 RegTech & Compliance",
    "cyber": "🛡️ Cybersecurity", "crypto": "🔐 Cryptography & PQC", "identity": "🪪 Identity & Trust",
    "iot": "📡 IoT & Connected Devices", "cities": "🏙️ Smart Cities",
    "industrial": "🏭 Industrial", "service": "🛎️ Service Robots", "humanoid": "🦿 Humanoid Robots",
    "medical": "🩺 Medical",
    "crops": "🌾 Crops & Growing", "protein": "🥩 Alternative Protein", "supply": "🚚 Supply Chain",
    "rpa": "⚙️ RPA & Workflow",
  };
  // Group slugs shared across pages with different meanings get their label
  // per data-tech-domain here; GROUP_LABEL keys are unique, so a duplicate key
  // can't silently clobber another page's label again.
  var LABEL_OVERRIDE = {
    pcparts: { storage: "💾 Storage" },
  };
  var GROUP_SUB = {
    concept: "Frontier and biological energy — including how living things power themselves.",
    "experimental-gadget": "Research-stage and concept devices — not yet everyday products.",
    "ai-health": "Research/experimental — pattern spotting for future cures. Not medical advice.",
    "safe-human": "Roles where human judgement, dexterity, empathy or trust keep people ahead of AI.",
    "replacing-soon": "Highly repetitive, rule-based roles automating first. Timelines are estimates, not certainties.",
  };

  // Stages that are concepts/speculation rather than deployed or dated tech —
  // fenced visually so readers can tell tracked reality from horizon-scanning.
  var SPEC_STAGES = { spec: 1, speculative: 1, theory: 1, concept: 1, future: 1, civ: 1, "civilisation-scale": 1 };
  var FRESH_MS = 48 * 3600 * 1000;

  function tileHtml(t, domain) {
    var stage = STAGE_LABEL[t.stage] || String(t.stage || "").toUpperCase();
    var bg = t.photo
      ? "background-image:url('" + esc(t.photo) + "')"
      : "background-image:" + (TYPE_GRAD[t.etype] || TYPE_GRAD.st);
    // Feed tiles (worldIntel stream: no group, external source link) link OUT
    // to their fact-checked article — they have no pre-rendered detail page,
    // and the old per-page rewrite scripts matched an "?id=" href shape this
    // renderer stopped emitting, leaving every feed tile pointing at a
    // nonexistent detail page. Tracker tiles keep the crawlable detail page.
    var external = !t.group && t.link;
    var href = external
      ? t.link
      : "/website/sections/detail/" + domain + "/" + t.id + ".html";
    // Freshness (feed tiles carry pubDate): stories under 48h old wear a NEW
    // badge; every dated tile shows its date so "newest first" is checkable.
    var ts = Date.parse(t.pubDate || t.addedAt || "");
    var fresh = !isNaN(ts) && Date.now() - ts < FRESH_MS;
    var dateTxt = isNaN(ts) ? "" : new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    if (fresh) stage = "NEW";
    var spec = SPEC_STAGES[String(t.stage || "").toLowerCase()] === 1;
    var card =
      '<a class="tech-tile' + (spec ? " is-spec" : "") + '" href="' + esc(href) + '"' +
      (external ? ' target="_blank" rel="noopener"' : "") + ">" +
      '<div class="tech-tile-photo" role="img" aria-label="' + esc(t.name) + '" style="' + bg + '"></div>' +
      '<div class="tech-tile-body">' +
      '<div class="tech-tile-top">' +
      '<span class="tech-tile-name">' + esc(t.name) + "</span>" +
      '<span class="pbadge ' + (fresh ? "now" : esc(t.stage)) + '">' + esc(stage) + "</span>" +
      "</div>" +
      '<div class="tech-tile-sum">' + esc(t.what || "") + "</div>" +
      '<div class="tech-tile-foot">' +
      '<span class="tech-tile-type">' + esc(t.type || "") + (dateTxt ? " · " + esc(dateTxt) : "") + "</span>" +
      '<span class="tech-tile-arrow">' + (external ? "Read source →" : "View details →") + "</span>" +
      "</div></div></a>";
    // Buy/back links must sit OUTSIDE the tile anchor — a nested <a> is invalid
    // HTML and parse5 (npm run lint:website) rejects it. Only tiles that have
    // links get the wrapper, so every other tile's markup is unchanged.
    var row = linkRowHtml(t);
    return row ? '<div class="tech-tile-wrap">' + card + row + "</div>" : card;
  }

  // ── Affiliate / crowdfunding link rows (2026-08-05) ────────────────────
  // Config lives in /website/affiliate.json so tracking IDs are set in ONE
  // place. A tile says WHICH program and WHAT to search for; the renderer
  // builds the URL. If a program has no tracking id yet, the link is emitted
  // CLEAN — a half-built tracking param earns nothing and looks broken.
  var AFFIL = null;
  function loadAffiliate() {
    if (AFFIL) return Promise.resolve(AFFIL);
    return fetch("/website/affiliate.json?v=20260805a")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { AFFIL = j || { programs: {} }; return AFFIL; })
      .catch(function () { AFFIL = { programs: {} }; return AFFIL; });
  }
  function affiliateUrl(prog, entry) {
    var url = entry.url;
    if (!url) {
      if (!prog.search || !entry.q) return "";
      url = prog.search.replace("{q}", encodeURIComponent(entry.q));
    }
    if (prog.param && prog.id) {
      url += (url.indexOf("?") === -1 ? "?" : "&") + prog.param + "=" + encodeURIComponent(prog.id);
    }
    return url;
  }
  function linkRowHtml(t) {
    if (!AFFIL || !t.links || !t.links.length) return "";
    var out = t.links.map(function (entry) {
      var prog = AFFIL.programs && AFFIL.programs[entry.program];
      if (!prog) return "";
      var url = affiliateUrl(prog, entry);
      if (!url) return "";
      var paid = prog.commission === true;
      return (
        '<a class="tt-buy' + (paid ? " tt-buy-aff" : " tt-buy-fund") + '" href="' + esc(url) +
        '" target="_blank" rel="noopener sponsored nofollow">' +
        esc(prog.label || "Open") + " · " + esc(prog.name) +
        (paid ? '<span class="tt-buy-tag">ad</span>' : "") + "</a>"
      );
    }).join("");
    return out ? '<div class="tt-buy-row">' + out + "</div>" : "";
  }

  function render(grid) {
    var src = grid.getAttribute("data-tech-src");
    var domain = grid.getAttribute("data-tech-domain") || "";
    var grouped = grid.getAttribute("data-tech-grouped") === "true";
    if (!src) return;
    Promise.all([
      fetch(src).then(function (r) { return r.ok ? r.json() : []; }),
      loadAffiliate(),
    ])
      .then(function (both) { return both[0]; })
      .then(function (items) {
        items = (items || []).slice();
        if (!grouped) {
          // Ungrouped grids are either dated feeds (newest first) or a flat
          // tracker, which still reads in timeline order.
          items.sort(isFeed(items) ? byPubDateDesc : byStage);
          grid.innerHTML = items.map(function (t) { return tileHtml(t, domain); }).join("");
          return;
        }
        // Grouped: a titled section per category, in GROUP_ORDER (extras
        // appended), and timeline order inside each category.
        var seen = {}, order = GROUP_ORDER.slice();
        items.forEach(function (t) { if (order.indexOf(t.group) < 0) order.push(t.group); });
        grid.innerHTML = order.map(function (g) {
          if (seen[g]) return ""; seen[g] = 1;
          var inGroup = items.filter(function (t) { return t.group === g; }).sort(byStage);
          if (!inGroup.length) return "";
          var sub = GROUP_SUB[g] ? '<p class="tech-group-sub">' + esc(GROUP_SUB[g]) + "</p>" : "";
          return (
            // id lets pages deep-link a category (jobs uses #tg-<industry>).
            '<div class="tech-group" id="tg-' + esc(g) + '">' +
            '<div class="tech-group-hed">' +
            esc((LABEL_OVERRIDE[domain] && LABEL_OVERRIDE[domain][g]) || GROUP_LABEL[g] || g) +
            '<span class="tg-count">' + inGroup.length + " listed</span></div>" +
            sub +
            '<div class="tech-grid">' + inGroup.map(function (t) { return tileHtml(t, domain); }).join("") + "</div>" +
            "</div>"
          );
        }).join("");
      })
      .catch(function () {
        grid.innerHTML = '<p class="vs-dim" style="color:#8aa2bf;font-size:12px;">Technology data unavailable.</p>';
      });
  }
  function init() {
    // Speculation fence: concept-stage tiles get a dashed amber edge + tag so
    // horizon-scanning content can't be mistaken for deployed tech.
    if (!document.getElementById("techTileSpecStyles")) {
      var st = document.createElement("style");
      st.id = "techTileSpecStyles";
      st.textContent =
        ".tech-tile.is-spec{border:1px dashed rgba(251,191,36,.45);}" +
        ".tech-tile.is-spec .tech-tile-photo{filter:saturate(.75);}" +
        ".tech-tile.is-spec::after{content:'CONCEPT — NOT ESTABLISHED FACT';display:block;" +
        "font-size:7.5px;font-weight:800;letter-spacing:.1em;color:#fbbf24;padding:3px 10px 6px;}" +
        // Buy / back-this rows. Affiliate links are visually distinct from
        // crowdfunding ones so a reader can tell which pays us.
        ".tech-tile-wrap{display:flex;flex-direction:column;}" +
        ".tt-buy-row{display:flex;flex-wrap:wrap;gap:6px;padding:8px 2px 0;}" +
        ".tt-buy{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;" +
        "letter-spacing:.04em;text-decoration:none;padding:6px 10px;border-radius:7px;transition:.14s ease;}" +
        ".tt-buy-aff{color:#052e16;background:#4ade80;}" +
        ".tt-buy-aff:hover{background:#86efac;}" +
        ".tt-buy-fund{color:#c3d3ec;background:rgba(15,23,42,.8);border:1px solid rgba(148,163,184,.28);}" +
        ".tt-buy-fund:hover{border-color:#67e8f9;color:#fff;}" +
        ".tt-buy-tag{font-size:7.5px;font-weight:800;letter-spacing:.1em;opacity:.65;text-transform:uppercase;}";
      document.head.appendChild(st);
    }
    document.querySelectorAll("[data-tech-src]").forEach(render);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* tech-detail.js — renders a technology detail page from its domain JSON
   (?d=<domain>&id=<id>), expanded to the 17-section universal template.

   Two content classes, by trust:
   • AI-descriptive sections come from a pre-generated per-tile file at
     /website/sections/<dir>/details/<id>.json (labelled "AI overview").
   • Trust-sensitive sections (papers, references, costs, companies, case
     studies) are NEVER AI-generated here — they render as real outbound
     "verify-yourself" search links computed live from the tile name, so
     nothing fabricated (fake DOIs, invented prices/companies) is ever shown.
   Externalised so the page carries no inline script. */
(function () {
  // Domain code → data file + section page. Add domains here as the detail
  // template rolls out across the site.
  var DOMAINS = {
    nrg: { src: "/website/sections/domain-nrg/energy-tech.json", back: "/website/sections/domain-nrg/index.html", label: "Energy & Power" },
    gadgets: { src: "/website/sections/gadgets/gadgets.json", back: "/website/sections/gadgets/index.html", label: "Gadgets" },
    health: { src: "/website/sections/health/health.json", back: "/website/sections/health/index.html", label: "Health" },
    jobs: { src: "/website/sections/jobs/jobs.json", back: "/website/sections/jobs/index.html", label: "Jobs & Automation" },
    pcparts: { src: "/website/sections/pc-parts/pc-parts.json", back: "/website/sections/pc-parts/index.html", label: "PC Parts" },
    aisystems: { src: "/website/sections/ai-systems/ai-systems.json", back: "/website/sections/ai-systems/index.html", label: "Best AI Systems" },
    med: { src: "/website/sections/domain-med/medtech.json", back: "/website/sections/domain-med/index.html", label: "Medicine & Biotech" },
  };
  var STAGE = {
    now: "NOW", near: "NEAR", far: "FAR", theory: "THEORY",
    lab: "LAB", trial: "TRIAL", proto: "PROTO", pilot: "PILOT",
    soon: "1–3 YRS", mid: "3–7 YRS", later: "7–15 YRS", safe: "HUMAN-SAFE",
  };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function qp(k) { return new URLSearchParams(location.search).get(k) || ""; }

  var dcode = qp("d") || "nrg";
  var id = qp("id");
  var dom = DOMAINS[dcode] || DOMAINS.nrg;
  var back = document.getElementById("tdBack");
  back.href = dom.back;
  back.textContent = "← Back to " + dom.label;

  // Per-tile AI-overview file lives beside the domain JSON under /details/.
  var detailsSrc = dom.src.replace(/[^/]+$/, "details/" + encodeURIComponent(id) + ".json");

  Promise.all([
    fetch(dom.src).then(function (r) { return r.ok ? r.json() : []; }),
    fetch(detailsSrc).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
  ]).then(function (out) {
    var items = out[0] || [];
    var details = out[1];
    var ai = (details && details.ai) || {};
    var host = document.getElementById("tdContent");
    var t = items.filter(function (x) { return x.id === id; })[0];
    if (!t) {
      host.innerHTML = '<p class="td-text">Technology not found. <a class="td-back" href="' + dom.back + '">Return to the section →</a></p>';
      return;
    }
    document.title = t.name + " | The Future 24/7";
    var stage = STAGE[t.stage] || String(t.stage || "").toUpperCase();
    var bg = t.photo ? "background-image:url('" + esc(t.photo) + "')" : "background-image:linear-gradient(140deg,#0c4a6e,#38bdf8)";

    // ── helpers ───────────────────────────────────────────────────────────
    function para(s) { return s ? '<p class="td-text">' + esc(s) + "</p>" : ""; }
    function aiBody(key, fallback) {
      var v = ai[key] || fallback || "";
      if (!v) return '<p class="td-text td-pending">Detailed overview is being generated.</p>';
      return para(v);
    }
    function num(n, title) {
      return '<div class="td-sec-head"><span class="td-num">' + n + "</span>" + '<span class="td-sec-title">' + esc(title) + "</span></div>";
    }
    function note(s) { return '<p class="td-note">' + esc(s) + "</p>"; }
    function list(arr) {
      if (!arr || !arr.length) return "";
      return '<ul class="td-list">' + arr.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
    }
    function linkrow(links) {
      return '<div class="td-linkrow">' + links.map(function (l) {
        return '<a class="td-link" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label) + " ↗</a>";
      }).join("") + "</div>";
    }
    function sq(extra) { return encodeURIComponent(t.name + (extra ? " " + extra : "")); }

    var scholar = "https://scholar.google.com/scholar?q=" + sq();
    var semantic = "https://www.semanticscholar.org/search?q=" + sq() + "&sort=relevance";
    var crossref = "https://search.crossref.org/?q=" + sq();
    var pubmed = "https://pubmed.ncbi.nlm.nih.gov/?term=" + sq();
    var suppliers = "https://www.google.com/search?q=" + sq("manufacturers suppliers companies");
    var prices = "https://www.google.com/search?q=" + sq("cost price market");
    var cases = "https://www.google.com/search?q=" + sq("case study results deployment");
    var wiki = "https://en.wikipedia.org/w/index.php?search=" + sq();

    var companies = (t.companies || []).map(function (c) {
      return '<span class="td-company">' + esc(c) + "</span>";
    }).join("");

    function spec(k, v) {
      if (v == null || v === "" || v === "—") return "";
      return '<div class="td-spec"><div class="td-spec-k">' + esc(k) + '</div><div class="td-spec-v">' + esc(v) + "</div></div>";
    }

    var lifeStage = ai.lifecycleStage || "";

    var html =
      '<div class="td-hero" style="' + bg + '">' +
        '<div class="td-hero-cap">' +
          '<h1 class="td-title">' + esc(t.name) + "</h1>" +
          '<div class="td-badges">' +
            '<span class="etype ' + esc(t.etype || "st") + '">' + esc(t.type || "") + "</span>" +
            '<span class="pbadge ' + esc(t.stage) + '">' + esc(stage) + "</span>" +
          "</div>" +
        "</div>" +
      "</div>" +

      '<div class="td-banner">' +
        "<strong>How to read this page.</strong> The written overview is an " +
        "AI-generated educational summary" +
        (details && details.model ? " (" + esc(details.model) + ")" : "") +
        ". Papers, references, costs and companies are <em>verify-yourself</em> " +
        "links — we do not fabricate citations, prices or company lists." +
      "</div>" +

      num(1, "Definition") + aiBody("definition", t.what) +
      '<div class="td-specs">' + spec("Category", t.type) + spec("Best use", t.use) + spec("Stage", stage) + "</div>" +

      num(2, "How It Works") + aiBody("howItWorks", t.how) +
      num(3, "Problem It Solves") + aiBody("problemSolved") +
      num(4, "Manufacturing / Creation Process") + aiBody("manufacturing") +
      num(5, "Materials Used") + (ai.materials && ai.materials.length ? list(ai.materials) : aiBody("materials")) +
      num(6, "Build Process") + aiBody("buildProcess") +

      num(7, "Companies Involved") +
        (companies ? '<div class="td-companies">' + companies + "</div>" : '<p class="td-text td-pending">No companies curated for this tile yet.</p>') +
        note("Curated names only — none are invented. Use the link to find more.") +
        linkrow([{ label: "Find suppliers & makers", url: suppliers }]) +

      num(8, "Estimated Costs") + aiBody("costDrivers") +
        note("Cost drivers only — no verified dollar figures are shown. Check live sources for prices.") +
        linkrow([{ label: "Search current prices", url: prices }]) +

      num(9, "Lifecycle / Journey Stage") +
        (lifeStage ? '<div class="td-life"><span class="td-lifebadge">' + esc(lifeStage) + "</span></div>" : "") +
        aiBody("lifecycleOutlook") +

      num(10, "Scientific Papers / White Papers") +
        note("Live searches — we don't list papers we can't verify.") +
        linkrow([
          { label: "Google Scholar", url: scholar },
          { label: "Semantic Scholar", url: semantic },
          { label: "PubMed", url: pubmed },
          { label: "Crossref", url: crossref },
        ]) +

      num(11, "Regulation & Compliance") + aiBody("regulation") +
      num(12, "Risks") + aiBody("risks") +
      num(13, "Profitability Potential") + aiBody("profitability") +

      num(14, "Case Studies") +
        note("Illustrative — search real, dated examples rather than trusting a generated story.") +
        linkrow([{ label: "Search case studies", url: cases }]) +

      num(15, "Future Development") + aiBody("futureDevelopment") +

      num(16, "Glossary") +
        (ai.glossary && ai.glossary.length
          ? '<dl class="td-glossary">' + ai.glossary.map(function (g) {
              return "<dt>" + esc(g.term) + "</dt><dd>" + esc(g.def) + "</dd>";
            }).join("") + "</dl>"
          : '<p class="td-text td-pending">Glossary is being generated.</p>') +

      num(17, "References") +
        note("Verify against primary sources only.") +
        linkrow([
          { label: "Google Scholar", url: scholar },
          { label: "Crossref", url: crossref },
          { label: "Wikipedia", url: wiki },
        ]);

    host.innerHTML = html;
  }).catch(function () {
    document.getElementById("tdContent").innerHTML = '<p class="td-text">Could not load technology data.</p>';
  });
})();

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
  // Ordered power-type groups (containers with data-tech-grouped).
  var GROUP_ORDER = ["solar","wind","water","geo","bio","fossil","hydrogen","nuclear","fusion","storage","concept",
    // Jobs-by-industry (2026-07-15) — order matches the Industry Sectors list.
    "construction","manufacturing","logistics","agriculture","retail","healthcare","pharma","finance","mining","transport","business","government","media","callcentre","hospitality","education"];
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
    // PC Parts domain
    "core": "🧠 Core Components", "storage": "💾 Storage",
    "power": "⚡ Power & Cooling", "chassis": "🖥️ Case & Display",
    "peripheral": "⌨️ Peripherals",
    // AI Systems domain
    "assistant": "💬 AI Assistants", "coding": "💻 AI Coding",
    "image": "🎨 AI Image", "video": "🎬 AI Video", "voice": "🔊 AI Voice & Audio",
    "productivity": "📈 AI Productivity", "automation": "⚙️ Business Automation",
    // Jobs-by-industry sector headers (2026-07-15)
    "construction": "🏗️ Construction & Infrastructure", "manufacturing": "🏭 Manufacturing & Industrial Production",
    "logistics": "📦 Logistics, Warehousing & Supply Chain", "agriculture": "🌾 Agriculture & Food Production",
    "retail": "🛒 Retail & Consumer Services", "healthcare": "🏥 Healthcare & Medical Systems",
    "pharma": "💊 Pharmaceuticals & Biotech", "finance": "🏦 Finance, Banking & Insurance",
    "mining": "⛏️ Mining, Oil & Gas, Energy", "transport": "🚚 Transportation",
    "business": "💼 Business Operations & Corporate Workflows", "government": "🏛️ Government & Public Sector",
    "media": "🎬 Media, Entertainment & Creative Work", "callcentre": "📞 Call Centres & Customer Support",
    "hospitality": "🧹 Cleaning, Maintenance & Hospitality", "education": "🎓 Education",
  };
  var GROUP_SUB = {
    concept: "Frontier and biological energy — including how living things power themselves.",
    "experimental-gadget": "Research-stage and concept devices — not yet everyday products.",
    "ai-health": "Research/experimental — pattern spotting for future cures. Not medical advice.",
    "safe-human": "Roles where human judgement, dexterity, empathy or trust keep people ahead of AI.",
    "replacing-soon": "Highly repetitive, rule-based roles automating first. Timelines are estimates, not certainties.",
  };

  function tileHtml(t, domain) {
    var stage = STAGE_LABEL[t.stage] || String(t.stage || "").toUpperCase();
    var bg = t.photo
      ? "background-image:url('" + esc(t.photo) + "')"
      : "background-image:" + (TYPE_GRAD[t.etype] || TYPE_GRAD.st);
    var href = "/website/sections/tech-detail.html?d=" +
      encodeURIComponent(domain) + "&id=" + encodeURIComponent(t.id);
    return (
      '<a class="tech-tile" href="' + href + '">' +
      '<div class="tech-tile-photo" style="' + bg + '"></div>' +
      '<div class="tech-tile-body">' +
      '<div class="tech-tile-top">' +
      '<span class="tech-tile-name">' + esc(t.name) + "</span>" +
      '<span class="pbadge ' + esc(t.stage) + '">' + esc(stage) + "</span>" +
      "</div>" +
      '<div class="tech-tile-sum">' + esc(t.what || "") + "</div>" +
      '<div class="tech-tile-foot">' +
      '<span class="tech-tile-type">' + esc(t.type || "") + "</span>" +
      '<span class="tech-tile-arrow">View details →</span>' +
      "</div></div></a>"
    );
  }

  function render(grid) {
    var src = grid.getAttribute("data-tech-src");
    var domain = grid.getAttribute("data-tech-domain") || "";
    var grouped = grid.getAttribute("data-tech-grouped") === "true";
    if (!src) return;
    fetch(src)
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (items) {
        items = items || [];
        if (!grouped) {
          grid.innerHTML = items.map(function (t) { return tileHtml(t, domain); }).join("");
          return;
        }
        // Grouped: a titled section per power type, in GROUP_ORDER (extras appended).
        var seen = {}, order = GROUP_ORDER.slice();
        items.forEach(function (t) { if (order.indexOf(t.group) < 0) order.push(t.group); });
        grid.innerHTML = order.map(function (g) {
          if (seen[g]) return ""; seen[g] = 1;
          var inGroup = items.filter(function (t) { return t.group === g; });
          if (!inGroup.length) return "";
          var sub = GROUP_SUB[g] ? '<p class="tech-group-sub">' + esc(GROUP_SUB[g]) + "</p>" : "";
          return (
            '<div class="tech-group">' +
            '<div class="tech-group-hed">' + esc(GROUP_LABEL[g] || g) +
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
    document.querySelectorAll("[data-tech-src]").forEach(render);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

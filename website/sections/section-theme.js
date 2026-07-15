(function () {
  const path = String(location.pathname || "");
  if (!path.startsWith("/website/sections/")) return;

  const slug = path.split("/").filter(Boolean)[2] || "section";
  const titleFromDoc = String(document.title || "Section")
    .replace(/\s*\|\s*The Future 24\/7\s*$/i, "")
    .replace(/[-_]/g, " ")
    .trim();

  const firstP = document.querySelector("section p, main p, p");
  const summary = firstP
    ? firstP.textContent.trim()
    : "Live section intelligence feed with mapped entities, updates, and structured insights.";

  // Prefer the page's real section headline (e.g. "Energy & Power") over the
  // slug-derived document title (e.g. "Domain Nrg") for the hero.
  const headingEl = document.querySelector(
    '[class^="domain-title-"], [class*=" domain-title-"], main h2, section h2',
  );
  const headingText = headingEl
    ? headingEl.textContent
        .replace(/\s+/g, " ")
        .replace(/\s*[\u2014-]\s*Complete Intelligence Layer\s*$/i, "")
        .trim()
    : "";
  const heroTitle = headingText || titleFromDoc || "Section";

  let hero = document.getElementById("sectionThemeHero");
  if (!hero) {
    hero = document.createElement("section");
    hero.id = "sectionThemeHero";
    hero.className = "section-theme-hero";

    const existingImg = document.querySelector(
      ".section-audit-hero img, main img, section img, article img",
    );

    const photoWrap = document.createElement("div");
    photoWrap.className = "section-theme-photo";
    const img = document.createElement("img");
    img.alt = titleFromDoc + " photo";
    // Full-width themed hero photo per page (rulebook: sub-page top must be a
    // full-width photo that represents the page). Prefer the per-domain themed
    // image; the shared marketing mockup ("/photos in/site template.jpg") is
    // explicitly excluded so every page no longer shows the same banner.
    const existingSrc = existingImg?.getAttribute("src") || "";
    const isTemplate = /site[%20 ]template\.jpg/i.test(existingSrc);
    // Prefer an author-provided real hero image first (a page that ships its own
    // representative image should not fire a 404 probing for a generated photo).
    // The shared marketing mockup is excluded. Fall back to the per-domain
    // generated photo, then a themed procedural banner, then the world hero.
    const heroCandidates = [];
    if (existingSrc && !isTemplate) heroCandidates.push(existingSrc);
    // Cache-buster: hero backgrounds were regenerated to wide cinematic quality
    // (bump this token whenever the generated hero images are re-rendered).
    const heroVersion = "?v=20260703h";
    heroCandidates.push("/images/generated/" + slug + ".jpg" + heroVersion);
    heroCandidates.push("/images/banners/" + slug + ".svg");
    heroCandidates.push(
      "/images/generated/world-intel-hero-1782732519795.jpg" + heroVersion,
    );
    let heroIdx = 0;
    img.src = heroCandidates[0];
    img.addEventListener("error", () => {
      heroIdx += 1;
      if (heroIdx < heroCandidates.length) {
        img.src = heroCandidates[heroIdx];
      } else {
        photoWrap.style.display = "none";
      }
    });
    photoWrap.appendChild(img);

    const summaryWrap = document.createElement("div");
    summaryWrap.className = "section-theme-summary";
    const kicker = document.createElement("p");
    kicker.className = "section-theme-kicker";
    kicker.textContent = "Section Intelligence";
    const title = document.createElement("h1");
    title.className = "section-theme-title";
    title.textContent = heroTitle;
    const sub = document.createElement("p");
    sub.className = "section-theme-sub";
    sub.textContent = summary;
    summaryWrap.append(kicker, title, sub);

    hero.append(photoWrap, summaryWrap);
  }

  const WORLD_TILES = [
    {
      title: "AI",
      kicker: "Core",
      path: "/website/sections/domain-ai/index.html",
      photo: "/images/generated/domain-ai.jpg",
      slug: "domain-ai",
    },
    {
      title: "Medicine",
      kicker: "Health",
      path: "/website/sections/domain-med/index.html",
      photo: "/images/generated/domain-med.jpg",
      slug: "domain-med",
    },
    {
      title: "Energy",
      kicker: "Power",
      path: "/website/sections/domain-nrg/index.html",
      photo: "/images/generated/domain-nrg.jpg",
      slug: "domain-nrg",
    },
    {
      title: "Materials",
      kicker: "Build",
      path: "/website/sections/domain-mat/index.html",
      photo: "/images/generated/domain-mat.jpg",
      slug: "domain-mat",
    },
    {
      title: "Neuro",
      kicker: "Brain",
      path: "/website/sections/domain-neu/index.html",
      photo: "/images/generated/domain-neu.jpg",
      slug: "domain-neu",
    },
    {
      title: "Space",
      kicker: "Orbital",
      path: "/website/sections/domain-spc/index.html",
      photo: "/images/generated/domain-spc.jpg",
      slug: "domain-spc",
    },
    {
      title: "Security",
      kicker: "Shield",
      path: "/website/sections/domain-sec/index.html",
      photo: "/images/generated/domain-sec.jpg",
      slug: "domain-sec",
    },
    {
      title: "Govern",
      kicker: "Policy",
      path: "/website/sections/domain-gov/index.html",
      photo: "/images/generated/domain-gov.jpg",
      slug: "domain-gov",
    },
    {
      title: "Build",
      kicker: "Infra",
      path: "/website/sections/domain-bld/index.html",
      photo: "/images/generated/domain-bld.jpg",
      slug: "domain-bld",
    },
    {
      title: "Cosm",
      kicker: "Aesthetics",
      path: "/website/sections/domain-cos/index.html",
      photo: "/images/generated/domain-cos.jpg",
      slug: "domain-cos",
    },
    {
      title: "Smart",
      kicker: "Systems",
      path: "/website/sections/domain-smt/index.html",
      photo: "/images/generated/domain-smt.jpg",
      slug: "domain-smt",
    },
    {
      title: "Robotics",
      kicker: "Automation",
      path: "/website/sections/domain-robotics/index.html",
      photo: "/images/generated/domain-robotics.jpg",
      slug: "domain-robotics",
    },
    {
      title: "World Intel",
      kicker: "Live",
      path: "/website/sections/worldIntel/index.html",
      photo: "/images/generated/world-intel-hero-1782732519795.jpg",
      slug: "worldintel",
    },
  ];

  const DOMAIN_ALIASES = {
    AI: "AI",
    Medicine: "Medicine",
    Energy: "Energy",
    Materials: "Materials",
    Neuro: "Neuro",
    Space: "Space",
    Security: "Security",
    Govern: "Govern",
    Governance: "Govern",
    Build: "Build",
    Construction: "Build",
    Cosm: "Cosm",
    Cosmetics: "Cosm",
    Intel: "World Intel",
    "World Intel": "World Intel",
    "Smart Systems": "Smart",
    Smart: "Smart",
    Robotics: "Robotics",
    // Server now canonicalises engine shorthand (domain-fut, med, nrg…), but
    // keep code aliases here as belt-and-braces for older cached payloads.
    "Current/Future Tech": "World Intel",
    "domain-ai": "AI",
    "domain-med": "Medicine",
    "domain-nrg": "Energy",
    "domain-mat": "Materials",
    "domain-neu": "Neuro",
    "domain-spc": "Space",
    "domain-sec": "Security",
    "domain-gov": "Govern",
    "domain-bld": "Build",
    "domain-cos": "Cosm",
    "domain-int": "World Intel",
    "domain-smt": "Smart",
    "domain-rob": "Robotics",
    "domain-cur": "World Intel",
    "domain-fut": "World Intel",
    "domain-civ": "World Intel",
    med: "Medicine",
    nrg: "Energy",
    mat: "Materials",
    spc: "Space",
    sec: "Security",
    syn: "Smart",
    fut: "World Intel",
    cur: "World Intel",
  };

  const SLUG_TO_TILE = {
    "domain-ai": "AI",
    "domain-med": "Medicine",
    "domain-nrg": "Energy",
    "domain-mat": "Materials",
    "domain-neu": "Neuro",
    "domain-spc": "Space",
    "domain-sec": "Security",
    "domain-gov": "Govern",
    "domain-bld": "Build",
    "domain-cos": "Cosm",
    "domain-smt": "Smart",
    "domain-robotics": "Robotics",
    worldIntel: "World Intel",
    intelligence: "World Intel",
  };

  const currentTileTitle = SLUG_TO_TILE[slug] || "";

  function tilePhotoFallbacks(primary) {
    const candidates = [
      primary,
      "/images/generated/world-intel-hero-1782732519795.jpg",
      "/photos%20in/Ai%20rankings%20ui%20for%20page.png",
    ].filter(Boolean);
    return [...new Set(candidates)];
  }

  function tryNextTilePhoto(imgEl) {
    if (!imgEl) return;
    let list = [];
    try {
      list = JSON.parse(imgEl.dataset.fallbacks || "[]");
    } catch (_) {
      list = [];
    }
    const idx = Number(imgEl.dataset.fallbackIndex || "0") + 1;
    imgEl.dataset.fallbackIndex = String(idx);
    if (idx < list.length) {
      imgEl.src = list[idx];
    } else {
      imgEl.style.display = "none";
    }
  }

  // Live World Intelligence Panels are MAIN-PAGE ONLY. Removed from all
  // section/sub pages per owner directive + site rulebook. Strip any existing
  // panel node (e.g. from cached HTML) so it never renders on sub pages.
  document.getElementById("sectionWorldPanels")?.remove();

  // Insert only the section hero (picture at top — rulebook Rule 1).
  const firstBlock = document.querySelector(
    ".section-page-top, main, section, article, .wrap, #matrix",
  );
  if (firstBlock && firstBlock.parentNode) {
    if (!hero.parentNode) {
      firstBlock.parentNode.insertBefore(hero, firstBlock);
    }
  } else if (!hero.parentNode) {
    document.body.insertBefore(hero, document.body.firstChild);
  }

  const legacyTop = document.querySelector(".section-page-top");
  if (legacyTop) {
    legacyTop.style.display = "none";
  }
  // Hide the in-page marketing mockup banner; the themed hero above replaces it.
  document.querySelectorAll(".section-audit-hero").forEach((el) => {
    el.style.display = "none";
  });
})();

// Canonical tile template enhancer — picture at top of every .pc tile
// (rulebook Rule 1). Shared across all section pages. Binds real assigned
// images from /api/tile-images. Free-provider images only.
(function () {
  if (!String(location.pathname || "").startsWith("/website/sections/")) return;
  const NORM = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  const STOP = new Set([
    "the", "and", "for", "with", "from", "into", "your", "our", "are", "was",
    "ai", "systems", "system", "tech", "technology", "technologies", "new",
    "next", "now", "future", "using", "based", "driven",
  ]);
  const TOKENS = (s) =>
    String(s || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOP.has(w));
  // Per-domain hero fallback so every tile shows a domain-representative image
  // (rulebook: no blank placeholders). Derived from the page slug.
  const pageSlug =
    (String(location.pathname || "").split("/").filter(Boolean)[2] || "").trim();
  const domainFallback = pageSlug
    ? "/images/generated/" + pageSlug + ".jpg"
    : "";
  function fuzzyMatch(title, catalog) {
    const tw = TOKENS(title);
    if (!tw.length || !catalog || !catalog.length) return "";
    let best = "";
    let bestScore = 0;
    for (const c of catalog) {
      const cw = c.w || [];
      let shared = 0;
      for (const w of cw) if (tw.includes(w)) shared += 1;
      if (!shared) continue;
      // Reward specificity: prefer catalog entries whose tokens are mostly
      // covered by the tile title over broad multi-word slugs.
      const score = shared + shared / Math.max(cw.length, tw.length);
      if (score > bestScore) {
        bestScore = score;
        best = c.img;
      }
    }
    // Require at least two shared meaningful words to trust a fuzzy hit.
    return bestScore >= 2 ? best : "";
  }
  function enhance(map) {
    const byTitle = (map && map.byTitle) || {};
    const byId = (map && map.byId) || {};
    const catalog = (map && map.catalog) || [];
    document.querySelectorAll(".pc").forEach((pc) => {
      if (pc.querySelector(".pc-imgwrap")) return;
      const titleEl = pc.querySelector(".pc-title");
      if (!titleEl) return;
      const titleText = titleEl.textContent.trim();
      const key = NORM(titleText);
      const src =
        byTitle[key] ||
        byId["pc-" + key] ||
        byId[pc.id] ||
        fuzzyMatch(titleText, catalog) ||
        domainFallback ||
        "";
      const wrap = document.createElement("div");
      wrap.className = "pc-imgwrap";
      if (src) {
        const img = document.createElement("img");
        img.className = "pc-img";
        img.loading = "lazy";
        img.decoding = "async";
        img.alt = titleText;
        img.addEventListener("load", () => img.classList.add("loaded"));
        img.addEventListener("error", () => {
          // Last-resort: if a fuzzy/primary image 404s, try the domain hero
          // before showing the failed state.
          if (domainFallback && img.src.indexOf(domainFallback) === -1) {
            img.src = domainFallback;
            return;
          }
          wrap.classList.add("failed");
          img.remove();
        });
        img.src = src;
        wrap.appendChild(img);
      } else {
        wrap.classList.add("failed");
      }
      pc.insertBefore(wrap, pc.firstChild);
    });
  }
  function init() {
    fetch("/api/tile-images")
      .then((r) => (r.ok ? r.json() : null))
      .then((map) => enhance(map || {}))
      .catch(() => enhance({}));
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* toggleMed — referenced by every disease row's onclick since the page was
   built, but never implemented (clicks threw ReferenceError and expansion
   rows could never collapse). Toggles the #med-<id> expansion row. */
window.toggleMed = function (id) {
  const row = document.getElementById("med-" + id);
  if (!row) return;
  const open = row.classList.toggle("open");
  const trigger = row.previousElementSibling;
  if (trigger && trigger.classList.contains("drow")) trigger.classList.toggle("open", open);
};

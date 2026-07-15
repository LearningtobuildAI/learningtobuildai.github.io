(function () {
  if (window.__GLOBAL_SITE_SHELL__) return;
  window.__GLOBAL_SITE_SHELL__ = true;

  const path = String(location.pathname || "");
  if (/\/maintenance\.html$/i.test(path)) return;
  // The home page ships its own full-height hero nav; the global shell would
  // stack on top of it as a duplicate banner. Skip it on the ROOT index only
  // (section pages like /website/sections/*/index.html still need the shell).
  if (path === "/" || path.toLowerCase() === "/index.html") return;

  // ── Primary nav: Domains hub + the standalone sections ──────────────────
  // All 18 domain pages now live behind the Domains landing page (rendered
  // from SITE_SCHEMA); the banner carries only the hub + section pages.
  const primary = [
    ["Home", "/index.html"],
    ["Domains", "/website/sections/domains/index.html"],
    ["Gadgets", "/website/sections/gadgets/index.html"],
    ["Health", "/website/sections/health/index.html"],
    ["Jobs", "/website/sections/jobs/index.html"],
    ["PC Parts", "/website/sections/pc-parts/index.html"],
    ["AI Systems", "/website/sections/ai-systems/index.html"],
    ["Intel", "/website/intel/index.html"],
  ];

  function isCurrent(href) {
    if (path === href) return true;
    if (href === "/index.html") return path === "/" || path === "/index.html";
    // The Domains hub owns every individual domain page too.
    if (/\/sections\/domains\//.test(href))
      return /\/sections\/(domains|domain-[^/]+)\//i.test(path);
    const base = href.split("#")[0].replace(/\/index\.html$/i, "");
    return base.length > 1 && path.startsWith(base);
  }
  function linkEl(label, href, cls) {
    const a = document.createElement("a");
    a.className = cls || "gss-link";
    a.href = href;
    a.textContent = label;
    if (isCurrent(href)) a.classList.add("current");
    return a;
  }

  const shell = document.createElement("div");
  shell.className = "global-site-shell";
  shell.innerHTML = [
    '<div class="gss-bar">',
    '  <a class="gss-brand" href="/index.html">◆ THE FUTURE 24/7</a>',
    '  <nav class="gss-primary" aria-label="Primary navigation"></nav>',
    '  <div class="gss-actions">',
    '    <a class="gss-quick" href="/reference.html">Reference</a>',
    '    <a class="gss-quick" href="/website/contact/index.html">Contact</a>',
    '    <button class="gss-btn" type="button" id="gssPublicChat">Chat</button>',
    '    <a href="/admin-chat.html?provider=guide" id="gssAdminChat">Admin Chat</a>',
    "  </div>",
    "</div>",
  ].join("");

  const pnav = shell.querySelector(".gss-primary");
  primary.forEach(([l, h]) => pnav.appendChild(linkEl(l, h)));

  document.body.classList.add("gss-enabled");
  document.body.insertBefore(shell, document.body.firstChild);

  // Public / Admin chat wiring (unchanged behaviour).
  const publicBtn = document.getElementById("gssPublicChat");
  if (publicBtn) {
    publicBtn.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("site-shell-open-chat"));
      // Movable AI Companion handles the event when present (section pages).
      if (document.getElementById("siteMovableChat")) return;
      // Main page has no movable companion — open its inline Public Chat float.
      if (typeof window.toggleFloat === "function") {
        window.toggleFloat(true);
        return;
      }
      location.href = "/index.html";
    });
  }
  const adminLink = document.getElementById("gssAdminChat");
  if (adminLink) {
    adminLink.addEventListener("click", (event) => {
      const onMain = /\/index\.html$/i.test(path) || path === "/";
      if (onMain && typeof window.toggleFloat === "function") {
        event.preventDefault();
        window.toggleFloat(true);
        if (typeof window.requestAdminMode === "function") window.requestAdminMode();
        return;
      }
      event.preventDefault();
      const popup = window.open(
        "/admin-chat.html?provider=guide",
        "algalonChatWindow",
        "width=470,height=780,left=120,top=80,resizable=yes,scrollbars=yes",
      );
      if (popup) popup.focus();
    });
  }
})();

/* Domain quick-nav (2026-07-15): every section page gets the domain ring at
   the top so visitors can jump between domains without going home first. */
(function () {
  if (!/\/website\/sections\//.test(location.pathname)) return;
  if (document.querySelector(".domain-quick-nav")) return;
  var D = [["AI","domain-ai"],["Medicine","domain-med"],["Energy","domain-nrg"],["Materials","domain-mat"],["Neuro","domain-neu"],["Space","domain-spc"],["Security","domain-sec"],["Governance","domain-gov"],["Construction","domain-bld"],["Cosmetics","domain-cos"],["Smart Systems","domain-smt"],["Robotics","domain-robotics"],["3D Printing","domain-3dp"],["World Intel","worldIntel"],["Quantum","domain-quantum"],["SynBio","domain-synbio"],["CivEng","domain-civeng"],["Xeno","domain-xeno"]];
  function build() {
    var bar = document.createElement("nav");
    bar.className = "domain-quick-nav";
    bar.setAttribute("aria-label", "Domain directory");
    bar.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 18px;background:rgba(2,6,23,.96);border-bottom:1px solid rgba(56,189,248,.18);font-size:11px;letter-spacing:.02em;";
    bar.innerHTML = '<a href="/index.html" style="color:#67e8f9;text-decoration:none;font-weight:700;margin-right:6px;">&#8962; HOME</a>' + D.map(function (d) {
      var here = location.pathname.indexOf("/" + d[1] + "/") > -1;
      return '<a href="/website/sections/' + d[1] + '/index.html" style="color:' + (here ? "#0ea5e9" : "#93c5fd") + ';text-decoration:none;padding:2px 8px;border:1px solid rgba(56,189,248,' + (here ? ".65" : ".22") + ');border-radius:10px;white-space:nowrap;">' + d[0] + "</a>";
    }).join("");
    document.body.insertBefore(bar, document.body.firstChild);
  }
  if (document.body) build(); else document.addEventListener("DOMContentLoaded", build);
})();

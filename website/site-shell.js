/* Site shell (2026-07-21): the injected banner (gss-bar) and the text
   domain-quick-nav row are REMOVED — every page's top is now just the Domain
   Directory strip (domain-directory-strip.js), same on every page. This shell
   only guarantees the strip exists on pages that never shipped a mount
   (reference, contact, intel, …). */
(function () {
  if (window.__GLOBAL_SITE_SHELL__) return;
  window.__GLOBAL_SITE_SHELL__ = true;

  const path = String(location.pathname || "");
  if (/\/maintenance\.html$/i.test(path)) return;

  function ensureStrip() {
    if (!document.getElementById("domainDirStrip")) {
      const mount = document.createElement("div");
      mount.id = "domainDirStrip";
      document.body.insertBefore(mount, document.body.firstChild);
    }
    if (!document.querySelector('script[src*="domain-directory-strip"]')) {
      const s = document.createElement("script");
      s.src = "/website/domain-directory-strip.js?v=20260805b";
      document.body.appendChild(s);
    }
  }
  // Site-wide footer credit (2026-08-05, owner request).
  function ensureFooter() {
    if (document.getElementById("siteCreditFooter")) return;
    const f = document.createElement("footer");
    f.id = "siteCreditFooter";
    f.style.cssText =
      "padding:26px 18px 30px;text-align:center;font-size:11px;letter-spacing:.08em;" +
      "color:#64809f;background:rgba(2,6,23,.94);border-top:1px solid rgba(56,189,248,.15);";
    f.innerHTML =
      'Designed &amp; directed by <span style="color:#93c5fd;font-weight:700;">Robert Weeks</span>' +
      ' &nbsp;·&nbsp; <span style="color:#67e8f9;font-weight:700;">Robert Weeks AI Systems</span>' +
      ' &nbsp;·&nbsp; The Future 24/7';
    document.body.appendChild(f);
  }
  function boot() { ensureStrip(); ensureFooter(); }
  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();

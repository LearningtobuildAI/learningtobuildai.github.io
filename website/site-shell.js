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
      s.src = "/website/domain-directory-strip.js?v=20260721a";
      document.body.appendChild(s);
    }
  }
  if (document.body) ensureStrip();
  else document.addEventListener("DOMContentLoaded", ensureStrip);
})();

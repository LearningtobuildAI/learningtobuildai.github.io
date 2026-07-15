/* Home-page counters — stamped from window.SITE_SCHEMA (site-data.js) so the
   hero numbers can never drift from the canonical domain data again
   (the 14-vs-18 class of bug). Card count stays server-driven elsewhere. */
(function () {
  var schema = window.SITE_SCHEMA;
  if (!schema || !Array.isArray(schema.domains)) return;

  var n = schema.domains.length;
  var companies = schema.domains.reduce(function (sum, d) {
    return sum + (Number(d.companies) || 0);
  }, 0);

  var badge = document.getElementById("heroDomainBadge");
  if (badge) badge.textContent = n + "/" + n + " Domains";

  var co = document.getElementById("heroCompanyCount");
  if (co && companies > 0) co.textContent = companies + "+";

  // Version badge under the logo (2026-07-15) — live from /api/version so it
  // shows the deployed semver + build time (index.html mtime). Lets us confirm
  // we're looking at the same build. Falls back to the static HTML text.
  var ver = document.getElementById("siteVersion");
  if (ver) {
    fetch("/api/version")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (v) {
        if (!v || !v.version) return;
        var label = "v" + v.version;
        if (v.buildTime) {
          var d = new Date(v.buildTime);
          var pad = function (x) { return String(x).padStart(2, "0"); };
          label += " · built " + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
            " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
        }
        ver.textContent = label;
      })
      .catch(function () {});
  }
})();

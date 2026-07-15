/* map-panels.js (2026-07-15) — concept-style chrome for the 3D navigator map
   (#home3dmap): title block, INTERCONNECTED FUTURE blurb, LIVE INSIGHTS pairs
   and a SYSTEM OVERVIEW fed live from /api/world-data. Pure overlay — the 3D
   scene itself is untouched. */
(function () {
  var map = document.getElementById("home3dmap");
  if (!map || map.querySelector(".map-chrome")) return;
  if (getComputedStyle(map).position === "static") map.style.position = "relative";

  var PANEL =
    "position:absolute;z-index:12;background:rgba(3,10,26,.82);border:1px solid rgba(56,189,248,.22);" +
    "border-radius:12px;padding:14px 16px;color:#dce8f8;font-family:Inter,'Segoe UI',Arial,sans-serif;" +
    "backdrop-filter:blur(6px);pointer-events:none;max-width:280px;";

  function el(html, css) {
    var d = document.createElement("div");
    d.className = "map-chrome";
    d.style.cssText = PANEL + css;
    d.innerHTML = html;
    return d;
  }

  // Title (top-left)
  map.appendChild(
    el(
      '<div style="font-size:26px;font-weight:900;letter-spacing:.02em;line-height:1.1;color:#f2f8ff;">GLOBAL TECHNOLOGY<br>CO-EVOLUTION MAP</div>' +
        '<div style="margin-top:8px;font-size:12px;color:#7dd3fc;border-left:2px solid #38bdf8;padding-left:8px;">Shaping a smarter, sustainable future</div>',
      "top:18px;left:18px;background:transparent;border:none;backdrop-filter:none;",
    ),
  );

  // Interconnected future blurb (top-right)
  map.appendChild(
    el(
      '<div style="font-size:11px;font-weight:800;letter-spacing:.14em;color:#93c5fd;">INTERCONNECTED FUTURE</div>' +
        '<div style="margin-top:6px;font-size:12px;line-height:1.5;color:#b7c9e4;">Our world is an ecosystem of interconnected technologies. Innovation in one domain drives progress in many others.</div>' +
        '<div style="margin-top:8px;height:2px;width:60px;background:linear-gradient(90deg,#38bdf8,transparent);"></div>',
      "top:18px;right:18px;",
    ),
  );

  // Live insights (right, mid)
  var pairs = [
    ["AI ↔ Medicine", "#a78bfa"],
    ["Energy ↔ Space", "#fbbf24"],
    ["Materials ↔ Construction", "#f87171"],
    ["Neuro ↔ AI", "#818cf8"],
    ["SynBio ↔ Medicine", "#4ade80"],
  ];
  map.appendChild(
    el(
      '<div style="font-size:11px;font-weight:800;letter-spacing:.14em;color:#93c5fd;">LIVE INSIGHTS</div>' +
        pairs
          .map(function (p) {
            return (
              '<div style="margin-top:8px;font-size:12px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' +
              p[1] +
              ';margin-right:7px;box-shadow:0 0 6px ' +
              p[1] +
              ';"></span>' +
              p[0] +
              '<div style="font-size:10px;color:#64809f;margin-left:14px;">High impact</div></div>'
            );
          })
          .join(""),
      "top:120px;right:18px;",
    ),
  );

  // System overview (bottom-right) — live numbers.
  var overview = el(
    '<div style="font-size:11px;font-weight:800;letter-spacing:.14em;color:#93c5fd;">SYSTEM OVERVIEW</div>' +
      '<div class="map-ov-row" style="display:flex;gap:18px;margin-top:8px;font-size:12px;">' +
      '<div><div class="map-ov-domains" style="font-size:20px;font-weight:900;color:#f2f8ff;">…</div><div style="font-size:9px;letter-spacing:.1em;color:#64809f;">DOMAINS</div></div>' +
      '<div><div class="map-ov-cards" style="font-size:20px;font-weight:900;color:#f2f8ff;">…</div><div style="font-size:9px;letter-spacing:.1em;color:#64809f;">INTEL CARDS</div></div>' +
      '<div><div style="font-size:20px;font-weight:900;color:#4ade80;">24/7</div><div style="font-size:9px;letter-spacing:.1em;color:#64809f;">AUTONOMOUS</div></div>' +
      "</div>",
    "bottom:18px;right:18px;",
  );
  map.appendChild(overview);

  fetch("/api/world-data?limit=1")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d) return;
      var doms = Object.keys(d.counts || {}).length;
      overview.querySelector(".map-ov-domains").textContent = doms || "18";
      // HONEST COUNT (2026-07-15): sum of cards ACTUALLY rendered across section
      // pages (liveTileCounts), NOT d.total — the raw scan-archive total that
      // over-counted the real card count ~14x (13.8k signals vs ~970 cards).
      var liveCards = Object.values(d.liveTileCounts || {}).reduce(function (a, b) {
        return a + (Number(b) || 0);
      }, 0);
      overview.querySelector(".map-ov-cards").textContent = (liveCards || d.total || 0).toLocaleString();
    })
    .catch(function () {});
})();

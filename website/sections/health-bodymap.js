/* health-bodymap.js — fills the body-system chips from health.json and links
   both the SVG organ hotspots and the chips to their detail pages. */
(function () {
  var src = "/website/sections/health/health.json";
  var chips = document.getElementById("bmSystems");
  fetch(src)
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (items) {
      var systems = (items || []).filter(function (t) { return t.group === "body-systems"; });
      // Chip row of every body system.
      if (chips) {
        chips.innerHTML = systems
          .map(function (t) {
            return '<a class="bm-sys-chip" href="/website/sections/tech-detail.html?d=health&id=' +
              encodeURIComponent(t.id) + '">' + t.name.replace(/ \(.*\)/, "") + "</a>";
          })
          .join("");
      }
      // SVG hotspots → matching detail page.
      var byId = {};
      systems.forEach(function (t) { byId[t.id] = t; });
      document.querySelectorAll(".bm-organ[data-sys]").forEach(function (g) {
        var sys = g.getAttribute("data-sys");
        if (!byId[sys]) return;
        g.style.cursor = "pointer";
        g.addEventListener("click", function () {
          window.location.href =
            "/website/sections/tech-detail.html?d=health&id=" + encodeURIComponent(sys);
        });
      });
    })
    .catch(function () {});
})();

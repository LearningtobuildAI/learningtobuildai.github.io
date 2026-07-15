/* THE FUTURE 24/7 — Phase-1 "Coming Soon" tile lists.
 * Renders <div class="coming-soon" data-page-id="<id>"></div> from coming-soon.json.
 * A planned tile is removed from the JSON list once its real tile is built.
 * Additive + data-driven — never touches existing page structure. */
(function () {
  "use strict";
  var SRC = "/website/sections/coming-soon.json?v=20260708a";

  function render(host, items) {
    if (!items || !items.length) { host.style.display = "none"; return; }
    var wrap = document.createElement("div");
    wrap.className = "cs-inner";

    var head = document.createElement("div");
    head.className = "cs-head";
    head.innerHTML =
      '<span class="cs-badge">PHASE 1</span>' +
      '<h3 class="cs-title">Coming Soon</h3>' +
      '<span class="cs-count">' + items.length + " planned</span>";
    wrap.appendChild(head);

    var list = document.createElement("div");
    list.className = "cs-list";
    items.forEach(function (label) {
      var chip = document.createElement("span");
      chip.className = "cs-chip";
      chip.textContent = label;
      list.appendChild(chip);
    });
    wrap.appendChild(list);
    host.appendChild(wrap);
  }

  function init() {
    var hosts = Array.prototype.slice.call(
      document.querySelectorAll(".coming-soon[data-page-id]")
    );
    if (!hosts.length) return;
    fetch(SRC)
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (data) {
        hosts.forEach(function (h) {
          render(h, data[h.getAttribute("data-page-id")] || []);
        });
      })
      .catch(function () {
        hosts.forEach(function (h) { h.style.display = "none"; });
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

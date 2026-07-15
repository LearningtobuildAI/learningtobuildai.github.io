
(function () {
  var NORM = function (s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  };
  function enhanceTiles(map) {
    var byTitle = (map && map.byTitle) || {};
    var byId = (map && map.byId) || {};
    var tiles = document.querySelectorAll(".pc");
    tiles.forEach(function (pc) {
      if (pc.querySelector(".pc-imgwrap")) return;
      var titleEl = pc.querySelector(".pc-title");
      if (!titleEl) return;
      var key = NORM(titleEl.textContent);
      var src = byTitle[key] || byId["pc-" + key] || byId[pc.id] || "";
      var wrap = document.createElement("div");
      wrap.className = "pc-imgwrap";
      if (src) {
        var img = document.createElement("img");
        img.className = "pc-img";
        img.loading = "lazy";
        img.decoding = "async";
        img.alt = titleEl.textContent.trim();
        img.addEventListener("load", function () {
          img.classList.add("loaded");
        });
        img.addEventListener("error", function () {
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
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (map) {
        enhanceTiles(map || {});
      })
      .catch(function () {
        enhanceTiles({});
      });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* ============================================================
   THE FUTURE 24/7 — Panel Manager
   Enforces the floatingSurfacePolicy from design-system.json:
   only ONE floating surface open at a time. Additive & defensive
   — observes known surfaces via MutationObserver and closes the
   others when one opens. Does NOT modify existing toggle logic.
   ============================================================ */
(function () {
  "use strict";
  if (window.__PANEL_MANAGER_INIT__) return;
  window.__PANEL_MANAGER_INIT__ = true;

  // Each surface declares how to detect "open" and how to close it.
  var SURFACES = [
    {
      id: "floatPanel",
      isOpen: function (el) {
        return el.classList.contains("float-open");
      },
      close: function (el) {
        el.classList.remove("float-open");
      },
      attr: "class",
    },
    {
      id: "siteMovableChat",
      isOpen: function (el) {
        return (
          el.classList.contains("open") ||
          el.classList.contains("smc-open") ||
          (el.style && el.style.display !== "none" && el.hidden === false &&
            el.getAttribute("aria-hidden") === "false")
        );
      },
      close: function (el) {
        el.classList.remove("open");
        el.classList.remove("smc-open");
        el.setAttribute("aria-hidden", "true");
      },
      attr: "class",
    },
    {
      id: "gssDropdown",
      isOpen: function (el) {
        return !el.hidden;
      },
      close: function (el) {
        el.hidden = true;
      },
      attr: "hidden",
    },
  ];

  var suppress = false;

  function closeOthers(openId) {
    if (suppress) return;
    suppress = true;
    try {
      SURFACES.forEach(function (s) {
        if (s.id === openId) return;
        var el = document.getElementById(s.id);
        if (el && s.isOpen(el)) {
          try {
            s.close(el);
          } catch (_) {}
        }
      });
    } finally {
      suppress = false;
    }
  }

  function observe(s) {
    var el = document.getElementById(s.id);
    if (!el) return;
    var obs = new MutationObserver(function () {
      if (s.isOpen(el)) closeOthers(s.id);
    });
    obs.observe(el, {
      attributes: true,
      attributeFilter: [s.attr, "style", "aria-hidden"],
    });
  }

  function init() {
    SURFACES.forEach(observe);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

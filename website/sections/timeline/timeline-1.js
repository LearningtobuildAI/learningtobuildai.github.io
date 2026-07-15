
(function () {
  const NORM = (s) =>
    String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const detail = document.getElementById("tlDetail");
  const items = [...document.querySelectorAll(".tl-item")];
  if (!detail || !items.length) return;
  const DOMAIN_LABEL = {
    "domain-ai": "AI", "domain-med": "Medicine", "domain-nrg": "Energy",
    "domain-mat": "Materials", "domain-neu": "Neuro", "domain-spc": "Space",
    "domain-sec": "Security", "domain-gov": "Governance",
    "domain-bld": "Construction", "domain-cos": "Cosmetics",
    "domain-smt": "Smart Systems", "domain-robotics": "Robotics",
    "domain-3dp": "3D Printing", "domain-agri": "Agriculture",
    worldIntel: "World Intel",
  };
  const domainPhoto = (d) =>
    d === "worldIntel"
      ? "/images/generated/world-intel-hero-1782732519795.jpg"
      : "/images/generated/" + d + ".jpg";
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
    );
  fetch("timeline-data.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const map = {};
      ((data && data.nodes) || []).forEach((n) => {
        map[NORM(n.title)] = n;
      });
      function show(item) {
        const evt = item.querySelector(".tl-evt");
        if (!evt) return;
        const n = map[NORM(evt.textContent)];
        const year = (item.querySelector(".tl-year") || {}).textContent || "";
        const where = (item.querySelector(".tl-where") || {}).textContent || "";
        const domain = n ? n.domain : "worldIntel";
        const summary = n
          ? n.summary
          : "A milestone in the history of human technology.";
        const label = DOMAIN_LABEL[domain] || "Explore";
        items.forEach((i) => i.classList.remove("tl-active"));
        item.classList.add("tl-active");
        detail.innerHTML =
          '<div class="tl-detail-card">' +
          '<div class="tl-detail-img" style="background-image:url(\'' +
          domainPhoto(domain) + '\')"></div>' +
          '<div class="tl-detail-body">' +
          '<div class="tl-detail-year">' + esc(year) + "</div>" +
          '<div class="tl-detail-title">' + esc(evt.textContent.trim()) + "</div>" +
          '<div class="tl-detail-where">' + esc(where) + "</div>" +
          '<p class="tl-detail-summary">' + esc(summary) + "</p>" +
          '<a class="tl-learn" href="/website/sections/' + domain +
          '/index.html">Learn more \u00b7 ' + esc(label) + " \u2192</a>" +
          "</div></div>";
        detail.classList.add("show");
      }
      items.forEach((item) => {
        const c = item.querySelector(
          ".tl-content-above, .tl-content-below",
        );
        if (!c) return;
        c.setAttribute("role", "button");
        c.setAttribute("tabindex", "0");
        c.addEventListener("click", () => show(item));
        c.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            show(item);
          }
        });
      });
      show(items[items.length - 1]);
    })
    .catch(() => {});
})();

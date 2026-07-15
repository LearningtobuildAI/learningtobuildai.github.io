(function () {
  const data = window.DOMAIN_TEMPLATE_DATA || {};
  const key = String(document.body?.dataset?.domainKey || "").toLowerCase();
  const domain = data[key];
  if (!domain) return;

  document.title = `${domain.name} | The Future 24/7`;

  const navOrder = [
    "ai",
    "medicine",
    "energy",
    "materials",
    "neuro",
    "space",
    "security",
    "govern",
    "build",
    "cosm",
    "intel",
    "contact",
    "smart-systems",
  ];

  const navRoot = document.getElementById("domainNav");
  if (navRoot) {
    navRoot.innerHTML = "";
    navOrder.forEach((k) => {
      const item = data[k];
      if (!item) return;
      const a = document.createElement("a");
      a.href = `/website/${k}/index.html`;
      a.textContent = item.name;
      if (k === key) a.classList.add("active");
      navRoot.appendChild(a);
    });
  }

  const titleEl = document.getElementById("domainTitle");
  const summaryEl = document.getElementById("domainSummary");
  if (titleEl) titleEl.textContent = domain.name;
  if (summaryEl) summaryEl.textContent = domain.summary;

  const heroPhoto = document.getElementById("domainHeroPhoto");
  if (heroPhoto) {
    const fallback = `/images/generated/${key}.jpg`;
    let fallbackTried = false;
    heroPhoto.addEventListener("error", () => {
      if (!fallbackTried) {
        fallbackTried = true;
        heroPhoto.src = fallback;
        return;
      }
      const wrap = heroPhoto.closest(".domain-photo");
      if (wrap) wrap.style.display = "none";
    });
    heroPhoto.alt = `${domain.name} domain banner`;
    heroPhoto.src = `/images/banners/${key}.svg`;
  }

  function fillList(id, items) {
    const ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = "";
    (items || []).forEach((x) => {
      const li = document.createElement("li");
      li.textContent = x;
      ul.appendChild(li);
    });
  }

  fillList("liveUpdates", domain.liveUpdates);
  fillList("companies", domain.companies);
  fillList("breakthroughs", domain.breakthroughs);
  fillList("timeline", domain.timeline);
  fillList("forecast", domain.forecasts);

  const kpiSignals = document.getElementById("kpiSignals");
  const kpiCompanies = document.getElementById("kpiCompanies");
  const kpiBreakthroughs = document.getElementById("kpiBreakthroughs");
  const kpiForecast = document.getElementById("kpiForecast");
  if (kpiSignals)
    kpiSignals.textContent = String((domain.liveUpdates || []).length * 12);
  if (kpiCompanies)
    kpiCompanies.textContent = String((domain.companies || []).length);
  if (kpiBreakthroughs)
    kpiBreakthroughs.textContent = String((domain.breakthroughs || []).length);
  if (kpiForecast) kpiForecast.textContent = "24/7";
})();


  /* ── DETAIL MODAL ── */
  const DOMAIN_COLORS_DETAIL = {
    AI: "#00c4ff",
    Medicine: "#22c55e",
    Energy: "#f59e0b",
    Materials: "#a855f7",
    Neuro: "#ec4899",
    Space: "#38bdf8",
    Security: "#ef4444",
    Govern: "#64748b",
    Build: "#f97316",
    Cosm: "#d946ef",
    Intel: "#94a3b8",
    "Current/Future Tech": "#7c3aed",
  };

  function openDetail(title, domain, imageUrl, description, itemId) {
    const url = buildTechDetailUrl({
      title,
      domain,
      summary: description || "",
      image: imageUrl || "",
      itemId: itemId || "",
    });
    window.location.href = url;
  }

  function renderDetailContent(d, accentColor) {
    const stat = document.getElementById("detailStatus");
    if (stat) stat.textContent = d.status ? d.status.toUpperCase() : "";

    const statusColors = {
      operational: "#22c55e",
      emerging: "#f59e0b",
      research: "#00c4ff",
      theoretical: "#7c3aed",
    };
    const sCol = statusColors[d.status] || "#64748b";

    const companiesHtml = (d.companies || [])
      .map(
        (c) => `
  <a class="detail-company" href="${c.url || "#"}" target="_blank" rel="noopener">
    <div class="detail-company-dot">${(c.name || "?")[0]}</div>
    <div>
      <div class="detail-company-name">${c.name}</div>
      <div class="detail-company-role">${c.role || ""}</div>
    </div>
    <span class="detail-company-arrow">↗</span>
  </a>
`,
      )
      .join("");

    const factsHtml = (d.facts || []).map((f) => `<li>${f}</li>`).join("");
    const tagsHtml = (d.relatedDomains || [])
      .map((t) => `<span class="detail-tag">${t}</span>`)
      .join("");

    document.getElementById("detailContent").innerHTML = `
  <div class="detail-h1">${d.title}</div>
  <div class="detail-headline">${d.headline || ""}</div>

  <div class="detail-section">
    <div class="detail-section-label">What it does</div>
    <div class="detail-section-text">${d.whatItDoes || "—"}</div>
  </div>

  <div class="detail-section">
    <div class="detail-section-label">How it's made</div>
    <div class="detail-section-text">${d.howItsMade || "—"}</div>
  </div>

  <div class="detail-section">
    <div class="detail-section-label">Materials</div>
    <div class="detail-section-text">${d.materials || "—"}</div>
  </div>

  <div class="detail-section">
    <div class="detail-section-label">Energy requirements</div>
    <div class="detail-section-text">${d.energyNeeds || "—"}</div>
  </div>

  <div class="detail-section">
    <div class="detail-section-label">Global impact</div>
    <div class="detail-section-text">${d.impact || "—"}</div>
  </div>

  ${
    d.companies?.length
      ? `
  <div class="detail-section">
    <div class="detail-section-label">Key companies</div>
    <div class="detail-companies">${companiesHtml}</div>
  </div>`
      : ""
  }

  ${
    d.facts?.length
      ? `
  <div class="detail-section">
    <div class="detail-section-label">Key facts</div>
    <ul class="detail-facts">${factsHtml}</ul>
  </div>`
      : ""
  }

  ${
    tagsHtml
      ? `
  <div class="detail-section">
    <div class="detail-section-label">Related domains</div>
    <div class="detail-tags">${tagsHtml}</div>
  </div>`
      : ""
  }

  <div style="height:20px;"></div>
`;

    // Update status pill colour
    const statEl = document.getElementById("detailStatus");
    if (statEl) {
      statEl.style.color = sCol;
      statEl.style.borderColor = sCol + "44";
    }
  }

  function closeDetail() {
    document.getElementById("detailModal").classList.remove("open");
    document.body.style.overflow = "";
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDetail();
  });

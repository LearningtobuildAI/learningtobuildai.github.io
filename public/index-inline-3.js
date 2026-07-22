
  /* ── PHOTO MANAGER ── */
  let pmSlotsData = [];

  function normalizeSlotText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  /*
   * Exact-first matching. The old fuzzy pass (label.includes(wanted) ||
   * wanted.includes(label)) let a card with a SHORT title ("AI") match almost
   * every slot, and Array.find always returned that same first card — 46 dg slot
   * images were painted onto 4 distinct cards while the other 42 stayed empty.
   * Substring matching is now used only when it is unambiguous (exactly one
   * candidate), otherwise we return null and let targetIndex decide.
   */
  function findElementByName(elements, getName, targetName) {
    const wanted = normalizeSlotText(targetName);
    if (!wanted) return null;
    const exact = elements.find(
      (el) => normalizeSlotText(getName(el)) === wanted,
    );
    if (exact) return exact;
    const subs = elements.filter((el) => {
      const label = normalizeSlotText(getName(el));
      return label && (label.includes(wanted) || wanted.includes(label));
    });
    return subs.length === 1 ? subs[0] : null;
  }

  async function loadAndApplyImages() {
    try {
      try {
        await fetch("/api/reconcile-image-slots", { method: "POST" });
      } catch (_) {}
      const res = await fetch("/api/image-slots");
      const data = await res.json();
      pmSlotsData = data.slots || [];
      applyImagesToSite(pmSlotsData);
      renderSlotGrid(pmSlotsData);
    } catch (e) {
      console.warn("Photo manager: could not load image slots.", e);
    }
  }

  function applyImagesToSite(slots) {
    const dgCards = Array.from(
      document.querySelectorAll("#summary .dg-card"),
    );
    const portItems = Array.from(
      document.querySelectorAll(".portfolio-item"),
    );
    const tlItems = Array.from(document.querySelectorAll(".tl-item"));
    const biItems = Array.from(document.querySelectorAll(".bi"));
    const pcCards = Array.from(document.querySelectorAll(".pc"));

    for (const slot of slots) {
      if (!slot.assigned) continue;
      const url = slot.assigned;

      if (slot.targetType === "section") {
        const el = document.querySelector(slot.targetSelector);
        if (el) {
          el.style.backgroundImage = `linear-gradient(rgba(6,9,26,0.82),rgba(6,9,26,0.82)),url("${url}")`;
          el.style.backgroundSize = "cover";
          el.style.backgroundPosition = "center";
        }
      } else if (slot.targetType === "dg-card") {
        // Title-first: the cycle inserts cards, shifting indexes — the index is
        // only a fallback for cards whose title changed since the slot was cut.
        const card =
          findElementByName(
            dgCards,
            (el) => el.querySelector(".dg-title")?.textContent,
            slot.cardTitle || slot.name,
          ) || dgCards[slot.targetIndex];
        if (card) {
          let photo = card.querySelector(".dg-card-photo");
          if (!photo) {
            photo = document.createElement("div");
            photo.className = "dg-card-photo";
            card.prepend(photo);
          }
          photo.style.backgroundImage = `url("${url}")`;
        }
      } else if (slot.targetType === "portfolio-item") {
        const item = portItems[slot.targetIndex];
        if (item) {
          let photo = item.querySelector(".port-photo");
          if (!photo) {
            photo = document.createElement("div");
            photo.className = "port-photo";
            item.prepend(photo);
          }
          photo.style.backgroundImage = `url("${url}")`;
        }
      } else if (slot.targetType === "tl-item") {
        const item =
          tlItems[slot.targetIndex] ||
          findElementByName(
            tlItems,
            (el) => el.querySelector(".tl-evt")?.textContent,
            slot.eventName || slot.name,
          );
        if (item) {
          const box = item.querySelector(".tl-icon-box");
          if (box) {
            box.style.backgroundImage = `url("${url}")`;
            box.style.backgroundSize = "cover";
            box.style.backgroundPosition = "center";
            box.classList.add("has-photo");
            box.style.border = "1px solid rgba(255,255,255,0.15)";
          }
        }
      } else if (slot.targetType === "bi-item") {
        const item =
          biItems[slot.targetIndex] ||
          findElementByName(
            biItems,
            (el) => el.querySelector(".bi-name")?.textContent,
            slot.subdomainName || slot.name,
          );
        if (item) {
          let thumb = item.querySelector(".bi-thumb");
          if (!thumb) {
            thumb = document.createElement("div");
            thumb.className = "bi-thumb";
            item.prepend(thumb);
          }
          thumb.style.backgroundImage = `url("${url}")`;
        }
      } else if (slot.targetType === "pc-card") {
        const card =
          pcCards[slot.targetIndex] ||
          findElementByName(
            pcCards,
            (el) => el.querySelector(".pc-title")?.textContent,
            slot.cardTitle || slot.name,
          );
        if (card) {
          // Inject image at TOP of card — text stays below the image
          let imgTop = card.querySelector(".card-img-top");
          if (!imgTop) {
            imgTop = document.createElement("div");
            imgTop.className = "card-img-top";
            card.prepend(imgTop);
          }
          imgTop.style.backgroundImage = `url("${url}")`;
          // Remove old background if any
          card.style.backgroundImage = "";
          // Wire up click-to-detail
          const titleEl = card.querySelector(".pc-title");
          const title = titleEl?.textContent?.trim() || slot.name;
          if (!card.dataset.detailBound) {
            card.dataset.detailBound = "1";
            card.addEventListener("click", () =>
              openDetail(
                title,
                slot.section?.split(" — ")[0] || "Technology",
                url,
                slot.dallePrompt,
                slot.id,
              ),
            );
          }
        }
      } else if (slot.targetType === "disease-row") {
        const row = document.querySelector(
          `tr[onclick="toggleMed('${slot.diseaseId}')"]`,
        );
        if (row) {
          let photoCell = row.querySelector(".disease-photo-cell");
          if (!photoCell) {
            photoCell = document.createElement("td");
            photoCell.className = "disease-photo-cell";
            photoCell.style.cssText =
              "width:52px;padding:4px 6px;vertical-align:middle;";
            const thumb = document.createElement("div");
            thumb.style.cssText =
              "width:44px;height:44px;border-radius:6px;background-size:cover;background-position:center;border:1px solid rgba(255,255,255,.12);flex-shrink:0;";
            photoCell.appendChild(thumb);
            row.prepend(photoCell);
          }
          const thumb = photoCell.querySelector("div");
          if (thumb) thumb.style.backgroundImage = `url("${url}")`;
        }
      } else if (slot.targetType === "domain-section") {
        const sec = document.getElementById(slot.sectionId);
        if (sec) {
          sec.style.backgroundImage = `linear-gradient(rgba(6,9,26,0.88),rgba(6,9,26,0.88)),url("${url}")`;
          sec.style.backgroundSize = "cover";
          sec.style.backgroundPosition = "center";
        }
      } else if (slot.targetType === "ai-company") {
        // Apply image as background of the matching co-badge span
        const badges = Array.from(document.querySelectorAll(".co-badge"));
        const badge = badges.find((b) => {
          const cell = b.closest(".r-co-cell");
          return (
            cell &&
            cell.querySelector(".r-model")?.textContent?.trim() ===
              slot.companyName
          );
        });
        if (badge) {
          badge.style.backgroundImage = `url("${url}")`;
          badge.style.backgroundSize = "cover";
          badge.style.backgroundPosition = "center";
          badge.textContent = "";
        }
      } else if (slot.targetType === "energy-tech-row") {
        // Apply image as subtle row background in the energy source table
        const rows = Array.from(
          document.querySelectorAll(".etbl tbody tr"),
        );
        const row = rows.find(
          (r) =>
            r.querySelector(".sn")?.textContent?.trim() ===
            slot.energySource,
        );
        if (row) {
          row.style.backgroundImage = `linear-gradient(90deg,rgba(6,9,26,0.9) 55%,transparent),url("${url}")`;
          row.style.backgroundSize = "cover";
          row.style.backgroundPosition = "right center";
        }
      }
    }

    // Bind newly added visual cards using semantic keywords from assigned slot metadata.
    applySemanticPhotoSlots(slots);
  }

  function normalizeSemanticTerms(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function applySemanticPhotoSlots(slots) {
    const targets = Array.from(
      document.querySelectorAll(".ai-photo-slot[data-img-key]"),
    );
    if (!targets.length || !Array.isArray(slots)) return;
    const assigned = slots.filter((slot) => slot && slot.assigned);
    if (!assigned.length) return;

    for (const node of targets) {
      const key = normalizeSemanticTerms(node.getAttribute("data-img-key"));
      if (!key) continue;
      const keywords = key.split(" ").filter(Boolean);
      let best = null;
      let bestScore = 0;

      for (const slot of assigned) {
        const slotText = normalizeSemanticTerms(
          [
            slot.name,
            slot.section,
            slot.description,
            slot.cardTitle,
            slot.cardDesc,
            slot.energySource,
            slot.eventName,
            slot.diseaseId,
            slot.dallePrompt,
          ].join(" "),
        );
        if (!slotText) continue;
        let score = 0;
        for (const term of keywords) {
          if (term.length < 3) continue;
          if (slotText.includes(term)) score += 1;
        }
        if (score > bestScore) {
          bestScore = score;
          best = slot;
        }
      }

      if (best && bestScore > 0) {
        node.style.backgroundImage = `linear-gradient(rgba(2,6,23,0.24),rgba(2,6,23,0.24)),url("${best.assigned}")`;
        node.style.backgroundSize = "cover";
        node.style.backgroundPosition = "center";
        node.style.border = "1px solid rgba(255,255,255,.12)";
      }
    }
  }

  async function scanSite() {
    const btn = document.getElementById("pmScanBtn");
    btn.textContent = "Scanning...";
    btn.disabled = true;
    setProgress("Scanning site for image opportunities...");
    try {
      const res = await fetch("/api/scan-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setProgress(
        `Found ${data.newSlots} new slots — total ${data.total} images needed`,
      );
      btn.textContent = `Scanned (${data.total})`;
      await loadAndApplyImages();
      alert(
        `Scan complete!\n\n+${data.newSlots} new image slots discovered:\n- Timeline events: ${data.breakdown.timeline}\n- Sub-domains: ${data.breakdown.subdomains}\n- Disease visuals: ${data.breakdown.diseases}\n- Tech cards: ${data.breakdown.techCards}\n- Domain sections: ${data.breakdown.domainSections}\n- AI companies: ${data.breakdown.aiCompanies || 0}\n- Energy technologies: ${data.breakdown.energyTech || 0}\n\nTotal: ${data.total} images\n\nClick "Generate All Missing" to start.`,
      );
    } catch (e) {
      setProgress(`Scan error: ${e.message}`);
      btn.textContent = "Scan Site";
    }
    btn.disabled = false;
  }

  function renderSlotGrid(slots) {
    const grid = document.getElementById("pmSlotGrid");
    if (!grid) return;
    const assigned = slots.filter((s) => s.assigned).length;
    document.getElementById("pmProgressText").textContent =
      `${assigned} / ${slots.length} images assigned`;
    document.getElementById("pmProgressBar").style.width =
      `${Math.round((assigned / slots.length) * 100)}%`;

    grid.innerHTML = slots
      .map(
        (slot) => `
    <div class="pm-slot ${slot.assigned ? "assigned" : ""}" data-slot-id="${slot.id}">
      <div class="pm-slot-thumb">
        ${
          slot.assigned
            ? `<img src="${slot.assigned}" loading="lazy" alt="${(slot.name || "Assigned image").replace(/"/g, "&quot;")}" onerror="this.style.display='none'">`
            : `<div class="no-img">+</div>`
        }
      </div>
      <div class="pm-slot-info">
        <div class="pm-slot-name">
          <span class="pm-status-dot" style="background:${slot.assigned ? "#22c55e" : "#475569"};"></span>
          ${slot.name}
        </div>
        <div class="pm-slot-section">${slot.section}</div>
        <div class="pm-slot-actions">
          <div class="pm-slot-btn" onclick="generateOneImage('${slot.id}')">Generate</div>
          <div class="pm-slot-btn" onclick="assignFromFile('${slot.id}')">Upload</div>
          ${slot.assigned ? `<div class="pm-slot-btn danger" onclick="clearSlot('${slot.id}')">Clear</div>` : ""}
        </div>
      </div>
    </div>
  `,
      )
      .join("");
  }

  function togglePhotoManager() {
    const pm = document.getElementById("photoManager");
    pm.classList.toggle("open");
    if (pm.classList.contains("open") && pmSlotsData.length === 0)
      loadAndApplyImages();
  }

  function switchPMTab(tab, el) {
    document
      .querySelectorAll(".pm-tab")
      .forEach((t) => t.classList.remove("active"));
    el.classList.add("active");
    document.getElementById("pmSlotsTab").style.display =
      tab === "slots" ? "" : "none";
    document.getElementById("pmReaderTab").style.display =
      tab === "reader" ? "" : "none";
  }

  async function generateOneImage(slotId) {
    setProgress(`Generating "${slotId}"…`);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setProgress(`Done: ${slotId}`);
      await loadAndApplyImages();
    } catch (e) {
      setProgress(`Error: ${e.message}`);
    }
  }

  async function generateAllImages() {
    setProgress("Starting generation — auto-loop running every 3 min…");
    try {
      const res = await fetch("/api/generate-all-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      setProgress(data.message || "Generation queued");
    } catch (e) {
      setProgress(`Error: ${e.message}`);
    }
  }

  /* ── AUTO-STATUS POLLER — refreshes every 15s, applies new images live ── */
  let _autoLastAssigned = 0;
  async function pollAutoStatus() {
    try {
      const res = await fetch("/api/auto-status");
      const s = await res.json();
      const dot = document.getElementById("pmAutoStatusDot");
      const lbl = document.getElementById("pmAutoStatusLabel");
      if (dot) dot.style.background = s.active ? "#22c55e" : "#f59e0b";
      if (lbl)
        lbl.textContent = s.active
          ? `Generating… ${s.assigned}/${s.total}`
          : s.missing === 0
            ? `All ${s.total} done`
            : `Next loop: ${s.nextRunIn}s — ${s.assigned}/${s.total}`;
      if (s.assigned !== _autoLastAssigned) {
        _autoLastAssigned = s.assigned;
        setProgress(`Auto-applied ${s.assigned}/${s.total} images`);
        updateProgressBar(s.assigned, s.total);
        const r2 = await fetch("/api/image-slots");
        const d2 = await r2.json();
        pmSlotsData = d2.slots || [];
        applyImagesToSite(pmSlotsData);
        if (
          document.getElementById("photoManager").classList.contains("open")
        )
          renderSlotGrid(pmSlotsData);
      }
    } catch (_) {}
  }
  setInterval(pollAutoStatus, 15000);
  setTimeout(pollAutoStatus, 2000);

  async function clearSlot(slotId) {
    const res = await fetch("/api/assign-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, imagePath: null }),
    });
    // just null it out client-side too
    const slot = pmSlotsData.find((s) => s.id === slotId);
    if (slot) slot.assigned = null;
    renderSlotGrid(pmSlotsData);
  }

  function assignFromFile(slotId) {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*";
    inp.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const base64 = await fileToBase64(file);
      setProgress(`Uploading to slot "${slotId}"…`);
      const res = await fetch("/api/assign-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          imageBase64: base64,
          mediaType: file.type,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProgress("Uploaded.");
        await loadAndApplyImages();
      } else setProgress(`Error: ${data.error}`);
    };
    inp.click();
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    const preview = document.getElementById("pmPreview");
    preview.src = `data:${file.type};base64,${base64}`;
    preview.classList.add("visible");
    await analyzeImage(base64, file.type, null);
  }

  async function analyzeFromUrl() {
    const url = document.getElementById("pmUrlInput").value.trim();
    if (!url) return;
    const preview = document.getElementById("pmPreview");
    preview.src = url;
    preview.classList.add("visible");
    await analyzeImage(null, null, url);
  }

  async function analyzeImage(base64, mediaType, imageUrl) {
    const result = document.getElementById("pmAnalysisResult");
    result.className = "pm-analysis-result visible";
    result.innerHTML = `<div style="display:flex;align-items:center;gap:8px;color:#475569;"><span style="animation:spin 1s linear infinite;display:inline-block;">⟳</span> Vision-Context analysis running…</div>`;
    setProgress("Running vision-context analysis…");
    try {
      const body = imageUrl
        ? { imageUrl }
        : { imageBase64: base64, mediaType };
      const res = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const v = data.analysis || data.vision || {};
      const slot = (data.slots || pmSlotsData).find(
        (s) => s.id === v.slotId,
      );
      const score = Number.isFinite(Number(v.matchScore))
        ? Number(v.matchScore)
        : 0;
      const verdict = (
        v.verdict || (score >= 70 ? "MATCH" : "MISMATCH")
      ).toUpperCase();
      const verdictColor = verdict === "MATCH" ? "#22c55e" : "#ef4444";
      const assignBtn = v.slotId
        ? base64
          ? `<button class="pm-btn primary" style="width:100%;margin-top:10px;" onclick="assignAnalyzed('${v.slotId}')">Assign to "${v.slotId}"</button>`
          : `<button class="pm-btn primary" style="width:100%;margin-top:10px;" onclick="assignFromUrl('${v.slotId}','${imageUrl}')">Assign to "${v.slotId}"</button>`
        : "";
      result.innerHTML = `
      <div style="font-size:10px;font-weight:700;color:#00c4ff;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;">Image Description</div>
      <div style="color:#e2e8f0;font-size:11px;line-height:1.6;margin-bottom:12px;">${v.imageDescription || "—"}</div>

      <div style="font-size:10px;font-weight:700;color:#00c4ff;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;">Text Meaning</div>
      <div style="color:#94a3b8;font-size:11px;line-height:1.6;margin-bottom:12px;">${v.textMeaning || "—"}</div>

      <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;">
        <span style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.08em;">Match Score</span>
        <span style="color:${score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444"};font-weight:800;">${score}%</span>
        <span style="font-size:10px;font-weight:700;color:${verdictColor};border:1px solid ${verdictColor}55;border-radius:4px;padding:1px 6px;letter-spacing:.07em;">${verdict}</span>
      </div>

      <div style="font-size:10px;font-weight:700;color:#00c4ff;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;">Reasoning</div>
      <div style="color:#94a3b8;font-size:11px;line-height:1.6;margin-bottom:12px;">${v.reasoning || "—"}</div>

      <div style="font-size:10px;font-weight:700;color:#7c3aed;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;">Suggested Replacement</div>
      <div style="color:#94a3b8;font-size:11px;line-height:1.6;margin-bottom:12px;">${v.suggestedReplacement || "None"}</div>

      <!-- SLOT MATCH -->
      <div style="border-top:1px solid rgba(255,255,255,.08);padding-top:10px;">
        <div style="font-size:10px;font-weight:700;color:#7c3aed;letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px;">Best Slot Match</div>
        <div style="font-weight:700;color:#22c55e;font-size:12px;">${v.slotId || "none"}</div>
        <div style="color:#94a3b8;font-size:10px;margin-top:2px;">${slot?.section || ""}</div>
        <div style="color:#64748b;font-size:10px;margin-top:4px;">${v.slotReasoning || ""}</div>
        <div style="color:#475569;font-size:10px;margin-top:2px;">Match confidence: ${Math.round((v.slotConfidence || 0) * 100)}%</div>
        ${assignBtn}
      </div>
    `;
      result._analysisData = {
        slotId: v.slotId,
        base64,
        mediaType,
        imageUrl,
      };
      setProgress("Vision analysis complete.");
    } catch (e) {
      result.innerHTML = `<span style="color:#ef4444;">Error: ${e.message}</span>`;
      setProgress("Analysis failed.");
    }
  }

  async function assignAnalyzed(slotId, type, imageUrl) {
    const result = document.getElementById("pmAnalysisResult");
    const d = result._analysisData || {};
    const body = d.base64
      ? { slotId, imageBase64: d.base64, mediaType: d.mediaType }
      : { slotId, imageUrl };
    setProgress(`Assigning to ${slotId}…`);
    const res = await fetch("/api/assign-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      setProgress("Assigned!");
      await loadAndApplyImages();
    } else setProgress(`Error: ${data.error}`);
  }

  async function assignFromUrl(slotId, imageUrl) {
    setProgress(`Assigning URL to ${slotId}…`);
    const res = await fetch("/api/assign-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, imagePath: imageUrl }),
    });
    const data = await res.json();
    if (data.success) {
      setProgress("Assigned!");
      await loadAndApplyImages();
    } else setProgress(`Error: ${data.error}`);
  }

  function setProgress(msg) {
    const el = document.getElementById("pmProgressText");
    if (el) el.textContent = msg;
  }

  function updateProgressBar(done, total) {
    const bar = document.getElementById("pmProgressBar");
    if (bar && total > 0)
      bar.style.width = `${Math.round((done / total) * 100)}%`;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = (e) => resolve(e.target.result.split(",")[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  // Drag-and-drop on the drop zone
  const pmDrop = document.getElementById("pmDrop");
  if (pmDrop) {
    pmDrop.addEventListener("dragover", (e) => {
      e.preventDefault();
      pmDrop.classList.add("drag-over");
    });
    pmDrop.addEventListener("dragleave", () =>
      pmDrop.classList.remove("drag-over"),
    );
    pmDrop.addEventListener("drop", async (e) => {
      e.preventDefault();
      pmDrop.classList.remove("drag-over");
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const base64 = await fileToBase64(file);
      document.getElementById("pmPreview").src =
        `data:${file.type};base64,${base64}`;
      document.getElementById("pmPreview").classList.add("visible");
      await analyzeImage(base64, file.type, null);
    });
  }

  /*
   * Auto-load and apply images on page load.
   *
   * This used to be a bare call at script-parse time, which raced the cards into
   * existence: applyImagesToSite() queries "#summary .dg-card", but those cards
   * aren't in the DOM yet when this script runs, so only the handful already
   * present got an image (4 of 50) and the other 42 were silently skipped for
   * good — the assigned image existed and served fine, it was just never applied.
   *
   * So: apply once the DOM is parsed, then re-apply on window load from the
   * cached slots (no second 667KB fetch) to catch anything rendered late.
   */
  // Auto-load and apply images on page load
  loadAndApplyImages();

  /* ── NAV MOUSEWHEEL HORIZONTAL SCROLL ── */
  (function () {
    const wrap = document.getElementById("navScrollWrap");
    if (!wrap) return;
    wrap.addEventListener(
      "wheel",
      function (e) {
        if (e.deltaY !== 0) {
          e.preventDefault();
          wrap.scrollLeft += e.deltaY * 0.8;
        }
      },
      { passive: false },
    );
  })();

  /* ════════════════════════════════════
   MOBILE NAV
════════════════════════════════════ */
  function toggleMobileNav() {
    const links = document.querySelector(".nav-links");
    const btn = document.getElementById("navHamburger");
    links.classList.toggle("mobile-open");
    btn.classList.toggle("open");
  }

  function openAlgalonWindow(event) {
    if (event) event.preventDefault();
    localStorage.setItem("algalonFollowMode", "1");
    const features =
      "width=470,height=780,left=120,top=80,resizable=yes,scrollbars=yes";
    const popup = window.open(
      "/admin-chat.html?follow=1",
      "algalonChatWindow",
      features,
    );
    if (popup) popup.focus();
    return false;
  }

  function openAdminChatWindow(event) {
    if (event) event.preventDefault();
    const adminUrl = "/admin-chat.html?provider=guide";
    const features =
      "width=470,height=780,left=120,top=80,resizable=yes,scrollbars=yes";
    const popup = window.open(adminUrl, "algalonChatWindow", features);
    if (popup) {
      popup.focus();
      return false;
    }
    window.location.href = adminUrl;
    return false;
  }

  function focusFollowChatWindow() {
    if (localStorage.getItem("algalonFollowMode") !== "1") return;
    try {
      const popup = window.open("", "algalonChatWindow");
      if (popup && !popup.closed) popup.focus();
    } catch {}
  }

  window.addEventListener("focus", focusFollowChatWindow);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") focusFollowChatWindow();
  });
  // Close mobile nav when a link is clicked
  document.querySelectorAll(".nav-links a").forEach((a) => {
    a.addEventListener("click", () => {
      document.querySelector(".nav-links").classList.remove("mobile-open");
      document.getElementById("navHamburger").classList.remove("open");
    });
  });

  /* ════════════════════════════════════
   SCROLL PROGRESS BAR + SCROLL-SPY
════════════════════════════════════ */
  const _sections = [
    "home",
    "matrix",
    "summary",
    "worldIntel",
    "domain-ai",
    "domain-cur",
    "domain-fut",
    "domain-med",
    "domain-nrg",
    "domain-mat",
    "domain-neu",
    "domain-spc",
    "domain-sec",
    "domain-gov",
    "domain-bld",
    "domain-3dp",
    "domain-robotics",
    "domain-auto-jobs",
    "domain-cos",
    "domain-smt",
    "domain-agri",
    "domain-syn",
    "intelligence",
    "portfolio",
    "timeline",
    "contact",
  ];
  const _navLinks = document.querySelectorAll(".nav-links a");

  window.addEventListener(
    "scroll",
    () => {
      // Scroll progress
      const prog = document.getElementById("scrollProgress");
      if (prog) {
        const pct =
          (window.scrollY /
            (document.documentElement.scrollHeight - window.innerHeight)) *
          100;
        prog.style.width = pct + "%";
      }
      // Scroll-spy
      let current = "home";
      for (const id of _sections) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 120) current = id;
      }
      _navLinks.forEach((a) => {
        a.classList.remove("active");
        if (a.getAttribute("href") === "#" + current)
          a.classList.add("active");
      });
    },
    { passive: true },
  );

  /* ════════════════════════════════════
   GLOBAL SEARCH ENGINE
════════════════════════════════════ */
  let _searchIndex = null;
  function buildSearchIndex() {
    if (_searchIndex) return _searchIndex;
    _searchIndex = [];
    // Tech cards
    document.querySelectorAll(".pc").forEach((card) => {
      const title = card.querySelector(".pc-title")?.textContent?.trim();
      const domain =
        card
          .closest(".domain-sec")
          ?.querySelector(".domain-hd h2, .domain-title")
          ?.textContent?.trim() || "Technology";
      if (title)
        _searchIndex.push({
          title,
          domain,
          type: "Tech",
          action: () => {
            card.scrollIntoView({ behavior: "smooth", block: "center" });
            card.style.outline = "2px solid #00c4ff";
            setTimeout(() => (card.style.outline = ""), 2000);
          },
        });
    });
    // Company rows
    document.querySelectorAll(".bi-name").forEach((el) => {
      const name = el.textContent?.trim();
      const domain =
        el
          .closest(".domain-sec")
          ?.querySelector(".domain-hd h2, .domain-title")
          ?.textContent?.trim() || "Domain";
      if (name)
        _searchIndex.push({
          title: name,
          domain,
          type: "Company",
          action: () =>
            el.scrollIntoView({ behavior: "smooth", block: "center" }),
        });
    });
    // Domain sections
    document.querySelectorAll(".domain-sec").forEach((sec) => {
      const h = sec
        .querySelector(".domain-hd h2, .domain-title")
        ?.textContent?.trim();
      if (h)
        _searchIndex.push({
          title: h,
          domain: "Domain",
          type: "Domain",
          action: () => sec.scrollIntoView({ behavior: "smooth" }),
        });
    });
    // World intel items
    (wiAllItems || []).forEach((it) => {
      _searchIndex.push({
        title: it.title,
        domain: it.domain,
        type: "Intel",
        action: () =>
          document
            .getElementById("worldIntel")
            ?.scrollIntoView({ behavior: "smooth" }),
      });
    });
    return _searchIndex;
  }

  function handleSearch(q) {
    const box = document.getElementById("searchResults");
    if (!q || q.length < 2) {
      box.classList.remove("open");
      return;
    }
    const idx = buildSearchIndex();
    const lower = q.toLowerCase();
    const matches = idx
      .filter(
        (it) =>
          it.title.toLowerCase().includes(lower) ||
          it.domain.toLowerCase().includes(lower),
      )
      .slice(0, 12);
    if (!matches.length) {
      box.innerHTML = `<div class="search-empty">No results for "${q}"</div>`;
    } else {
      box.innerHTML = matches
        .map(
          (m, i) => `
      <div class="search-result-item" onclick="searchGo(${i})">
        <div class="search-result-title">${m.title}</div>
        <div class="search-result-domain">${m.type} · ${m.domain}</div>
      </div>`,
        )
        .join("");
      box._matches = matches;
    }
    box.classList.add("open");
  }
  function searchGo(i) {
    const m = document.getElementById("searchResults")._matches?.[i];
    if (m) {
      m.action();
      document.getElementById("searchResults").classList.remove("open");
      document.getElementById("navSearchInput").value = "";
      _searchIndex = null;
    }
  }
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-search-wrap"))
      document.getElementById("searchResults")?.classList.remove("open");
  });

  /* ════════════════════════════════════════════
   WORLD INTEL FEED
════════════════════════════════════════════ */
  const WI_DOMAIN_COLORS = {
    AI: ["#00c4ff", "rgba(0,196,255,.12)"],
    Medicine: ["#22c55e", "rgba(34,197,94,.12)"],
    Energy: ["#f59e0b", "rgba(245,158,11,.12)"],
    Materials: ["#a855f7", "rgba(168,85,247,.12)"],
    Neuro: ["#ec4899", "rgba(236,72,153,.12)"],
    Space: ["#38bdf8", "rgba(56,189,248,.12)"],
    Security: ["#ef4444", "rgba(239,68,68,.12)"],
    Govern: ["#64748b", "rgba(100,116,139,.12)"],
    Build: ["#f97316", "rgba(249,115,22,.12)"],
    Cosm: ["#d946ef", "rgba(217,70,239,.12)"],
    Intel: ["#94a3b8", "rgba(148,163,184,.12)"],
    "Current/Future Tech": ["#7c3aed", "rgba(124,58,237,.12)"],
    "Smart Systems": ["#14b8a6", "rgba(20,184,166,.12)"],
  };

  const WI_DOMAIN_ROUTES = {
    AI: "/website/sections/domain-ai/index.html",
    Medicine: "/website/sections/domain-med/index.html",
    Energy: "/website/sections/domain-nrg/index.html",
    Materials: "/website/sections/domain-mat/index.html",
    Neuro: "/website/sections/domain-neu/index.html",
    Space: "/website/sections/domain-spc/index.html",
    Security: "/website/sections/domain-sec/index.html",
    Govern: "/website/sections/domain-gov/index.html",
    Build: "/website/sections/domain-bld/index.html",
    Cosm: "/website/sections/domain-cos/index.html",
    Intel: "/website/sections/intelligence/index.html",
    "Current/Future Tech": "/website/sections/domain-fut/index.html",
    "Smart Systems": "/website/sections/domain-smt/index.html",
    Robotics: "/website/sections/domain-robotics/index.html",
  };

  const WI_DOMAIN_PHOTOS = {
    AI: "/images/generated/sec-bg-domain-ai-1782731725341.jpg",
    Medicine: "/images/generated/sec-bg-domain-med-1782731726458.jpg",
    Energy: "/images/generated/sec-bg-domain-nrg-1782731726989.jpg",
    Materials: "/images/generated/sec-bg-domain-mat-1782731727278.jpg",
    Neuro: "/images/generated/sec-bg-domain-neu-1782731727798.jpg",
    Space: "/images/generated/sec-bg-domain-spc-1782731728140.jpg",
    Security: "/images/generated/sec-bg-domain-sec-1782731728630.jpg",
    Govern: "/images/generated/sec-bg-domain-gov-1782731728952.jpg",
    Build: "/images/generated/sec-bg-domain-bld-1782731729472.jpg",
    Cosm: "/images/generated/sec-bg-domain-cos-1782731729770.jpg",
    Intel: "/images/generated/sec-bg-domain-cur-1782731725616.jpg",
    "Current/Future Tech":
      "/images/generated/sec-bg-domain-fut-1782731726160.jpg",
    "Smart Systems":
      "/images/generated/sec-bg-domain-smt-1782731730297.jpg",
    Robotics: "/images/generated/sec-bg-domain-robotics-1782731731425.jpg",
  };

  let wiAllItems = [];
  let wiActiveFilter = "all";
  let wiKnownSections = [];

  function wiDomainStyle(domain) {
    const [color, bg] = WI_DOMAIN_COLORS[domain] || [
      "#94a3b8",
      "rgba(148,163,184,.12)",
    ];
    return `color:${color};background:${bg};border:1px solid ${color}33;`;
  }

  function wiTimeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000),
      h = Math.floor(m / 60),
      d = Math.floor(h / 24);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return "just now";
  }

  function wiFallbackPhoto(domain, primary) {
    const options = [
      primary,
      WI_DOMAIN_PHOTOS[domain],
      "/images/generated/sec-bg-domain-ai-1782731725341.jpg",
    ].filter(Boolean);
    return [...new Set(options)];
  }

  function wiTryNextPhoto(imgEl) {
    if (!imgEl) return;
    let list = [];
    try {
      list = JSON.parse(imgEl.dataset.fallbacks || "[]");
    } catch (_) {
      list = [];
    }
    const idx = Number(imgEl.dataset.fallbackIndex || "0") + 1;
    imgEl.dataset.fallbackIndex = String(idx);
    if (idx < list.length) {
      imgEl.src = list[idx];
    } else {
      imgEl.style.display = "none";
    }
  }

  function wiRender(items) {
    const grid = document.getElementById("wiGrid");
    if (!grid) return;
    if (!items.length) {
      grid.innerHTML =
        '<div class="wi-empty">No intelligence data yet — scan in progress…</div>';
      return;
    }
    grid.innerHTML = items
      .map((it, idx) => {
        const domainImg = {
          AI: "linear-gradient(135deg,#0ea5e9,#6366f1)",
          Medicine: "linear-gradient(135deg,#ef4444,#f97316)",
          Energy: "linear-gradient(135deg,#f59e0b,#22c55e)",
          Space: "linear-gradient(135deg,#6366f1,#0ea5e9)",
          Materials: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
          Security: "linear-gradient(135deg,#f97316,#ef4444)",
          Neuro: "linear-gradient(135deg,#a855f7,#6366f1)",
          Intel: "linear-gradient(135deg,#00c4ff,#7c3aed)",
          Governance: "linear-gradient(135deg,#10b981,#0ea5e9)",
          Construction: "linear-gradient(135deg,#f59e0b,#ef4444)",
          Cosmetics: "linear-gradient(135deg,#ec4899,#a855f7)",
        };
        const bg =
          domainImg[it.domain] || "linear-gradient(135deg,#1e293b,#334155)";
        const icon =
          {
            AI: "◈",
            Medicine: "✚",
            Energy: "⚡",
            Space: "◎",
            Materials: "⬡",
            Security: "◆",
            Neuro: "∿",
            Intel: "◉",
            Governance: "⊞",
            Construction: "⊟",
            Cosmetics: "◌",
          }[it.domain] || "●";
        const route = WI_DOMAIN_ROUTES[it.domain] || "";
        const photo =
          WI_DOMAIN_PHOTOS[it.domain] ||
          "/images/generated/world-intel-hero-1782732519795.jpg";
        const photoFallbacks = wiFallbackPhoto(it.domain, photo);
        return `<div class="wi-card" style="animation-delay:${idx * 0.03}s;cursor:pointer;" onclick="openDetail('${it.title.replace(/'/g, "\\'")}','${it.domain}','','${(it.summary || "").replace(/'/g, "\\'")}','${it.id}')">
      <div class="wi-card-media" style="background:${bg};">
        <img class="wi-card-photo" src="${photoFallbacks[0]}" alt="${it.domain} panel photo" loading="lazy" data-fallback-index="0" data-fallbacks='${JSON.stringify(photoFallbacks)}' onerror="wiTryNextPhoto(this)" />
        <div class="wi-card-media-overlay">
          <div>
            <div style="font-size:8px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.92);">${it.domain}</div>
            <div style="font-size:9px;color:rgba(255,255,255,.7);margin-top:2px;">${it.novelty === "high" ? "⚡ BREAKTHROUGH" : it.novelty === "medium" ? "↑ DEVELOPMENT" : "· UPDATE"}</div>
          </div>
          <span style="font-size:20px;opacity:.8;line-height:1;color:rgba(255,255,255,.9);">${icon}</span>
        </div>
      </div>
      <div class="wi-card-body">
      <div class="wi-card-title" style="margin-bottom:6px;">${it.title}</div>
      <div class="wi-card-summary">${it.summary || ""}</div>
      <div class="wi-card-footer">
        <span class="wi-source">${it.source} · ${wiTimeAgo(it.scannedAt)}</span>
        <div class="wi-card-actions">
          ${route ? `<a class="wi-domain-link" href="${route}" onclick="event.stopPropagation()">Open Section →</a>` : ""}
          ${it.link ? `<a class="wi-link" href="${it.link}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Read →</a>` : ""}
        </div>
      </div>
      ${it.sectionApplied ? '<div style="margin-top:8px;font-size:9px;color:#7c3aed;font-weight:700;">★ NEW SECTION ADDED TO SITE</div>' : ""}
      </div>
    </div>`;
      })
      .join("");
  }

  function wiFilter(btn, domain) {
    document
      .querySelectorAll(".wi-filter")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    wiActiveFilter = domain;
    const filtered =
      domain === "all"
        ? wiAllItems
        : wiAllItems.filter((it) => it.domain === domain);
    wiRender(filtered);
  }

  async function pollWorldIntel() {
    try {
      const res = await fetch("/api/world-data?limit=60");
      const data = await res.json();
      wiAllItems = data.items || [];

      // Show new section banner if new sections were auto-added
      const newSections = (data.newSections || []).filter(
        (s) => !wiKnownSections.includes(s),
      );
      if (newSections.length) {
        wiKnownSections = data.newSections;
        const banner = document.getElementById("wiNewSectionBanner");
        if (banner) {
          banner.className = "wi-new-section-banner visible";
          banner.innerHTML = `★ New tech domain auto-detected and added to site: <strong>${newSections.join(", ")}</strong> — scroll down to see it.`;
          setTimeout(() => banner.classList.remove("visible"), 12000);
        }
      }

      const filtered =
        wiActiveFilter === "all"
          ? wiAllItems
          : wiAllItems.filter((it) => it.domain === wiActiveFilter);
      wiRender(filtered);

      const meta = document.getElementById("wiMeta");
      if (meta && data.lastScan) {
        const ago = wiTimeAgo(data.lastScan);
        meta.textContent = `${data.total} items across all domains · Last scan ${ago} · Scan #${data.scanCount}`;
      }
    } catch (_) {}
  }

  setInterval(pollWorldIntel, 5 * 60 * 1000); // refresh every 5 minutes
  setTimeout(pollWorldIntel, 3000); // initial load after 3s

  /* ════════════════════════════════════════════
   AI TEAM DASHBOARD
════════════════════════════════════════════ */
  const AGENT_COLORS = { idle: "idle", running: "running", error: "error" };

  function toggleAITeam() {
    const p = document.getElementById("aiTeamPanel");
    p.classList.toggle("open");
    if (p.classList.contains("open")) pollAgentStatus();
  }

  function switchATTab(tab, btn) {
    document
      .querySelectorAll(".at-tab")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("atAgentsTab").style.display =
      tab === "agents" ? "flex" : "none";
    document.getElementById("atLogTab").style.display =
      tab === "log" ? "block" : "none";
    if (tab === "log") pollEvolutionLog();
  }

  function atTimeAgo(iso) {
    if (!iso) return "never";
    const m = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
  function atNextIn(iso) {
    if (!iso) return "";
    const s = Math.max(0, Math.round((new Date(iso) - Date.now()) / 1000));
    if (s < 60) return `next in ${s}s`;
    if (s < 3600) return `next in ${Math.round(s / 60)}m`;
    return `next in ${Math.round(s / 3600)}h`;
  }

  async function pollAgentStatus() {
    try {
      const res = await fetch("/api/agent-status");
      const data = await res.json();
      const dot = document.getElementById("atLockDot");
      const lbl = document.getElementById("atLockLabel");
      const cnt = document.getElementById("atEvoCount");
      if (dot)
        dot.className = "at-lock-dot" + (data.locked ? " locked" : "");
      if (lbl) lbl.textContent = data.locked ? "RUNNING" : "IDLE";
      if (cnt)
        cnt.textContent = `${data.agents?.reduce((t, a) => t + (a.lastRun ? 1 : 0), 0) || 0} agents active`;

      const grid = document.getElementById("atAgentsTab");
      if (!grid) return;
      grid.innerHTML = (data.agents || [])
        .map(
          (a) => `
      <div class="at-agent-card ${a.status}">
        <div class="at-agent-top">
          <span class="at-agent-emoji">${a.emoji}</span>
          <div class="at-agent-info">
            <div class="at-agent-name">${a.name}</div>
            <div class="at-agent-role">${a.role}</div>
          </div>
          <span class="at-agent-status ${a.status}">${a.status.toUpperCase()}</span>
        </div>
        ${a.lastResult ? `<div class="at-agent-last">${a.lastResult.slice(0, 120)}</div>` : ""}
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span class="at-agent-next">${a.lastRun ? "Last: " + atTimeAgo(a.lastRun) : "Not run yet"} · ${atNextIn(a.nextRun)}</span>
          <button class="at-run-btn" onclick="runAgent('${a.id}')" ${data.locked ? "disabled" : ""}>▶ Run</button>
        </div>
      </div>
    `,
        )
        .join("");
    } catch (_) {}
  }

  async function pollEvolutionLog() {
    try {
      const res = await fetch("/api/evolution-log?limit=30");
      const data = await res.json();
      const box = document.getElementById("atLogTab");
      if (!box) return;
      if (!data.log?.length) {
        box.innerHTML =
          '<div style="color:#475569;font-size:11px;padding:20px;text-align:center;">No evolution events yet</div>';
        return;
      }
      box.innerHTML = data.log
        .map(
          (e) => `
      <div class="at-evo-entry ${e.status}">
        <div class="at-evo-agent">${e.agent} ${e.patchCount > 0 ? `· ${e.patchCount} changes` : ""}</div>
        <div class="at-evo-desc">${e.description}</div>
        <div class="at-evo-time">${atTimeAgo(e.timestamp)}</div>
      </div>
    `,
        )
        .join("");
    } catch (_) {}
  }

  async function runAgent(agentId) {
    const btn = document.querySelector(
      `[onclick="runAgent('${agentId}')"]`,
    );
    if (btn) btn.disabled = true;
    try {
      await fetch("/api/run-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      setTimeout(pollAgentStatus, 2000);
      setTimeout(pollAgentStatus, 8000);
      setTimeout(pollAgentStatus, 20000);
    } catch (_) {}
  }

  async function runAllAgents() {
    const btn = document.getElementById("atRunAllBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Running…";
    }
    for (const id of [
      "architect",
      "contentCurator",
      "codeEngineer",
      "designReviewer",
      "qaAgent",
    ]) {
      await fetch("/api/run-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: id }),
      });
      await new Promise((r) => setTimeout(r, 3000));
    }
    setTimeout(() => {
      pollAgentStatus();
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Run All Now";
      }
    }, 5000);
  }

  async function restoreBackup() {
    if (
      !confirm(
        "Restore the most recent backup? This overwrites any agent changes.",
      )
    )
      return;
    const res = await fetch("/api/restore-backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await res.json();
    if (data.success) {
      alert(`Restored: ${data.restored}`);
    } else {
      alert(`Error: ${data.error}`);
    }
  }

  // Poll agent status every 20s when panel is open, every 60s otherwise
  setInterval(() => {
    if (document.getElementById("aiTeamPanel")?.classList.contains("open"))
      pollAgentStatus();
  }, 20000);
  setInterval(pollAgentStatus, 60000);
  setTimeout(pollAgentStatus, 5000);

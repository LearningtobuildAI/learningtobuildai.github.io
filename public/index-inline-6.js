
    /* ════════════════════════════════════
   CONTACT FORM — live submission
════════════════════════════════════ */
    async function submitContactForm(e) {
      e.preventDefault();
      const btn = document.getElementById("cf-submit");
      const status = document.getElementById("cf-status");
      btn.disabled = true;
      btn.textContent = "Sending…";
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: document.getElementById("cf-first")?.value,
            lastName: document.getElementById("cf-last")?.value,
            email: document.getElementById("cf-email")?.value,
            company: document.getElementById("cf-company")?.value,
            message: document.getElementById("cf-message")?.value,
          }),
        });
        const data = await res.json();
        status.style.display = "block";
        if (res.ok) {
          status.style.color = "#22c55e";
          status.textContent = "✓ " + data.message;
          document.getElementById("contactForm").reset();
        } else {
          status.style.color = "#ef4444";
          status.textContent =
            "✗ " + (data.error || "Failed to send. Try again.");
        }
      } catch (_) {
        status.style.display = "block";
        status.style.color = "#ef4444";
        status.textContent = "✗ Network error. Please try again.";
      }
      btn.disabled = false;
      btn.textContent = "Send Message";
    }

    /* ════════════════════════════════════
   COOKIE CONSENT
════════════════════════════════════ */
    (function initCookieBanner() {
      if (!localStorage.getItem("tf247_cookies")) {
        const b = document.getElementById("cookieBanner");
        if (b) {
          b.style.display = "flex";
        }
      }
    })();
    function acceptCookies() {
      localStorage.setItem("tf247_cookies", "accepted");
      document.getElementById("cookieBanner").style.display = "none";
    }
    function declineCookies() {
      localStorage.setItem("tf247_cookies", "declined");
      document.getElementById("cookieBanner").style.display = "none";
    }

    /* ════════════════════════════════════
   FIRST-VISIT ONBOARDING TOUR
════════════════════════════════════ */
    const TOUR_STEPS = [
      {
        title: "Welcome to The Future 24/7",
        text: "The most integrated technology intelligence platform — tracking 14 domains, 200+ companies, and live breakthroughs from around the world.",
        target: "#home",
        pos: "bottom",
      },
      {
        title: "Live World Intel",
        text: "New tech news is scanned every hour and classified by AI across all 14 domains. Click any card to see the full intelligence report.",
        target: "#worldIntel",
        pos: "bottom",
      },
      {
        title: "Ask the AI",
        text: "Use the 💬 chat icon to ask any technology question. Our AI cross-references all 14 domains for deep analysis and trend forecasts.",
        target: "#contact",
        pos: "top",
      },
    ];
    let _tourStep = 0;

    function startTour() {
      _tourStep = 0;
      document.getElementById("tourOverlay").style.display = "block";
      showTourStep();
    }
    function showTourStep() {
      const s = TOUR_STEPS[_tourStep];
      if (!s) return tourSkip();
      document.getElementById("tourStep").textContent =
        `STEP ${_tourStep + 1} OF ${TOUR_STEPS.length}`;
      document.getElementById("tourTitle").textContent = s.title;
      document.getElementById("tourText").textContent = s.text;
      document.getElementById("tourNext").textContent =
        _tourStep === TOUR_STEPS.length - 1 ? "Finish ✓" : "Next →";
      // position the box near the target
      const el = document.querySelector(s.target);
      const box = document.getElementById("tourBox");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          const r = el.getBoundingClientRect();
          box.style.top =
            (s.pos === "bottom"
              ? r.bottom + 12
              : r.top - box.offsetHeight - 12) + "px";
          box.style.left =
            Math.max(12, Math.min(r.left, window.innerWidth - 330)) + "px";
        }, 400);
      } else {
        box.style.top = "50%";
        box.style.left = "50%";
        box.style.transform = "translate(-50%,-50%)";
      }
    }
    function tourNext() {
      _tourStep++;
      if (_tourStep >= TOUR_STEPS.length) tourSkip();
      else showTourStep();
    }
    function tourSkip() {
      document.getElementById("tourOverlay").style.display = "none";
      localStorage.setItem("tf247_tour", "done");
    }
    // Auto-start tour on first visit (after cookie decision or 2s)
    setTimeout(() => {
      if (!localStorage.getItem("tf247_tour")) startTour();
    }, 2500);

    /* ════════════════════════════════════
   LIVE DOMAIN CHARTS
════════════════════════════════════ */
    function toggleLiveCharts() {
      // Live charts section is optional on this page.
      const section = document.getElementById("liveChartsWrap");
      if (!section) return;
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      renderDomainCharts();
    }

    async function renderDomainCharts() {
      const section = document.getElementById("liveChartsWrap");
      if (!section) return;

      try {
        const res = await fetch("/api/world-data?limit=200");
        const data = await res.json();
        const items = data.items || [];
        const health = document.getElementById("liveChartsHealth");
        if (health) {
          health.textContent = items.length
            ? `Chart Health: Live (${items.length} records)`
            : "Chart Health: Degraded (no records)";
          health.style.color = items.length ? "#4ade80" : "#f59e0b";
        }

        // Domain counts bar chart
        const domCounts = {};
        items.forEach((it) => {
          domCounts[it.domain] = (domCounts[it.domain] || 0) + 1;
        });
        const entries = Object.entries(domCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8);
        const DCOLS = {
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

        const canvas = document.getElementById("domainChart");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const W = canvas.width,
          H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        if (!entries.length) {
          ctx.fillStyle = "#64748b";
          ctx.font = "14px system-ui";
          ctx.textAlign = "center";
          ctx.fillText("No live domain records available", W / 2, H / 2);
        }
        const max = Math.max(...entries.map((e) => e[1]), 1);
        const barW = 24,
          gap = (W - entries.length * barW) / (entries.length + 1);
        entries.forEach(([dom, cnt], i) => {
          const x = gap + i * (barW + gap);
          const bH = Math.round((cnt / max) * (H - 40));
          const col = DCOLS[dom] || "#00c4ff";
          ctx.fillStyle = col + "33";
          ctx.fillRect(x, H - 30 - bH, barW, bH);
          ctx.fillStyle = col;
          ctx.fillRect(x, H - 32 - bH, barW, 2);
          ctx.fillStyle = "#475569";
          ctx.font = "8px system-ui";
          ctx.textAlign = "center";
          const abbr = dom.slice(0, 3).toUpperCase();
          ctx.fillText(abbr, x + barW / 2, H - 18);
          ctx.fillStyle = "#94a3b8";
          ctx.font = "9px system-ui";
          ctx.fillText(cnt, x + barW / 2, H - 34 - bH);
        });

        // Novelty distribution mini bars
        const nCounts = { high: 0, medium: 0, low: 0 };
        items.forEach((it) => {
          if (nCounts[it.novelty] !== undefined) nCounts[it.novelty]++;
        });
        const nMax = Math.max(...Object.values(nCounts), 1);
        const nCols = { high: "#22c55e", medium: "#f59e0b", low: "#475569" };
        const nbEl = document.getElementById("noveltyBars");
        if (!nbEl) return;
        nbEl.innerHTML = Object.entries(nCounts)
          .map(
            ([k, v]) =>
              `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;">
        <span style="font-size:10px;color:${nCols[k]};">${v}</span>
        <div style="width:100%;background:${nCols[k]}33;border-radius:4px 4px 0 0;height:${Math.max(10, Math.round((v / nMax) * 132))}px;border-top:2px solid ${nCols[k]};"></div>
       </div>`,
          )
          .join("");
      } catch (_) {
        const health = document.getElementById("liveChartsHealth");
        if (health) {
          health.textContent = "Chart Health: Offline";
          health.style.color = "#ef4444";
        }
      }
    }
    /* ── SYSTEM UPDATES & AI SCANNER ── */
    const _upd = { tab: "npm", data: null, scanData: null };

    function toggleUpdatesPanel() {
      const panel = document.getElementById("updatesPanel");
      const isOpen = panel.classList.contains("open");
      document.getElementById("aiTeamPanel").classList.remove("open");
      document.getElementById("photoManager").classList.remove("open");
      if (isOpen) {
        panel.classList.remove("open");
      } else {
        panel.classList.add("open");
        if (!_upd.data) runUpdatesCheck();
      }
    }

    function switchUpdTab(tab, el) {
      _upd.tab = tab;
      document
        .querySelectorAll(".upd-tab")
        .forEach((t) => t.classList.remove("active"));
      el.classList.add("active");
      renderUpdPanel();
    }

    async function runUpdatesCheck() {
      const btn = document.getElementById("updCheckBtn");
      btn.textContent = "Checking…";
      btn.disabled = true;
      try {
        const r = await fetch("/api/system-updates");
        _upd.data = await r.json();
        document.getElementById("updLastCheck").textContent =
          "Checked " + new Date().toLocaleTimeString();
        _updRefreshBadge();
        renderUpdPanel();
      } catch (e) {
        document.getElementById("updBody").innerHTML =
          `<div style="color:#ef4444;font-size:12px;padding:20px;">Error: ${e.message}</div>`;
      }
      btn.textContent = "Check Now";
      btn.disabled = false;
    }

    async function runAIScan() {
      const btn = document.getElementById("updScanBtn");
      if (btn) {
        btn.textContent = "Scanning…";
        btn.disabled = true;
      }
      try {
        const r = await fetch("/api/scan-ai-new", { method: "POST" });
        _upd.scanData = await r.json();
        renderUpdPanel();
      } catch (e) {
        const body = document.getElementById("updBody");
        body.innerHTML += `<div style="color:#ef4444;font-size:11px;padding:8px 0;">Scan error: ${e.message}</div>`;
      }
      if (btn) {
        btn.textContent = "Scan for New AI";
        btn.disabled = false;
      }
    }

    function _updRefreshBadge() {
      const count = Object.keys(_upd.data?.npm || {}).length;
      const badge = document.getElementById("updBadge");
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = "flex";
      } else {
        badge.style.display = "none";
      }
    }

    function renderUpdPanel() {
      const body = document.getElementById("updBody");
      const d = _upd.data;
      const tab = _upd.tab;

      if (tab === "npm") {
        if (!d) {
          body.innerHTML =
            '<div style="text-align:center;color:#475569;padding:40px 0;font-size:12px;">Click "Check Now" to scan</div>';
          return;
        }
        const pkgs = d.npm || {};
        const keys = Object.keys(pkgs);
        if (!keys.length) {
          body.innerHTML =
            '<div style="text-align:center;color:#22c55e;padding:40px 0;font-size:13px;">✓ All packages up to date</div>';
          return;
        }
        body.innerHTML = keys
          .map((k) => {
            const pkg = pkgs[k];
            const major =
              pkg.latest.split(".")[0] !== pkg.current.split(".")[0];
            return `<div class="upd-pkg">
        <div><div class="upd-pkg-name">${k}</div><div class="upd-pkg-ver">${pkg.current} → <b style="color:#e2e8f0">${pkg.latest}</b></div></div>
        <span class="upd-badge-${major ? "major" : "minor"}">${major ? "MAJOR" : "MINOR"}</span>
      </div>`;
          })
          .join("");
        return;
      }

      if (tab === "ai") {
        if (!d) {
          body.innerHTML =
            '<div style="text-align:center;color:#475569;padding:40px 0;font-size:12px;">Run "Check Now" first</div>';
          return;
        }
        const ai = d.ai || {};
        let html = "";

        if (ai.anthropic) {
          const avail = ai.anthropic.available || [];
          html += `<div class="upd-model-card">
        <div class="upd-model-label">Anthropic / Claude</div>
        <div class="upd-model-current">Current: <b style="color:#e2e8f0">${ai.anthropic.current || "—"}</b></div>
        <div class="upd-model-pills">${avail.map((m) => `<span class="upd-pill ${m === ai.anthropic.current ? "active-pill" : ""}">${m}</span>`).join("") || '<span style="color:#475569;font-size:11px;">No key set</span>'}</div>
      </div>`;
        }

        if (ai.openai) {
          const avail = ai.openai.availableChat || [];
          const imgAvail = ai.openai.availableImage || [];
          html += `<div class="upd-model-card">
        <div class="upd-model-label">OpenAI</div>
        <div class="upd-model-current">Chat: <b style="color:#e2e8f0">${ai.openai.chatCurrent}</b> &nbsp;|&nbsp; Image: <b style="color:#e2e8f0">${ai.openai.imageCurrent}</b></div>
        <div class="upd-model-pills">${avail.map((m) => `<span class="upd-pill ${m === ai.openai.chatCurrent ? "active-pill" : ""}">${m}</span>`).join("")}</div>
        ${imgAvail.length ? `<div class="upd-model-pills" style="margin-top:4px;">${imgAvail.map((m) => `<span class="upd-pill ${m === ai.openai.imageCurrent ? "active-pill" : ""}">${m}</span>`).join("")}</div>` : ""}
      </div>`;
        }

        if (ai.google) {
          const avail = ai.google.available || [];
          html += `<div class="upd-model-card">
        <div class="upd-model-label">Google / Gemini</div>
        <div class="upd-model-current">Image: <b style="color:#e2e8f0">${ai.google.imagePrimary}</b><br>Fallback: <b style="color:#e2e8f0">${ai.google.imageFallback}</b></div>
        <div class="upd-model-pills">${avail.map((m) => `<span class="upd-pill ${m === ai.google.imagePrimary || m === ai.google.imageFallback ? "active-pill" : ""}">${m}</span>`).join("")}</div>
      </div>`;
        }

        if (ai.ollama) {
          html += `<div class="upd-model-card">
        <div class="upd-model-label">Ollama (Local GPU)</div>
        <div class="upd-model-current">Status: <b style="color:${ai.ollama.online ? "#22c55e" : "#ef4444"}">${ai.ollama.online ? "Online" : "Offline"}</b> &nbsp;|&nbsp; Current: <b style="color:#e2e8f0">${ai.ollama.current}</b></div>
        ${ai.ollama.models?.length ? `<div class="upd-model-pills">${ai.ollama.models.map((m) => `<span class="upd-pill ${m === ai.ollama.current ? "active-pill" : ""}">${m}</span>`).join("")}</div>` : ""}
      </div>`;
        }

        body.innerHTML =
          html ||
          '<div style="color:#475569;font-size:12px;text-align:center;padding:20px;">No AI provider data — check API keys in .env</div>';
        return;
      }

      if (tab === "new") {
        const sd = _upd.scanData;
        if (!sd) {
          body.innerHTML = `<div style="text-align:center;padding:36px 0;">
        <div style="color:#64748b;font-size:12px;margin-bottom:16px;">Claude analyses all your live AI providers and suggests upgrades + new capabilities</div>
        <button id="updScanBtn" onclick="runAIScan()" style="background:linear-gradient(135deg,#7c3aed,#00c4ff);border:none;color:#fff;padding:10px 24px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:.04em;">✨ Scan for New AI</button>
        ${!_upd.data ? '<div style="color:#ef4444;font-size:10px;margin-top:10px;">Run "Check Now" first to load provider data</div>' : ""}
      </div>`;
          return;
        }
        if (sd.error && !sd.upgrades) {
          body.innerHTML = `<div style="color:#ef4444;font-size:12px;padding:16px;">Error: ${sd.error}</div>`;
          return;
        }

        let html = "";
        if (sd.upgrades?.length) {
          html += `<div class="upd-section-label" style="color:#a78bfa;">Model Upgrades</div>`;
          html += sd.upgrades
            .map(
              (u) => `<div class="upd-recommend">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
          <span style="font-size:12px;font-weight:700;color:#e2e8f0;">${u.role}</span>
          <span class="upd-impact ${u.impact || "low"}">${(u.impact || "low").toUpperCase()}</span>
        </div>
        <div style="font-size:10px;color:#64748b;margin-bottom:5px;">${u.current} → <b style="color:#00c4ff">${u.suggested}</b></div>
        <div style="font-size:11px;color:#94a3b8;">${u.reason}</div>
      </div>`,
            )
            .join("");
        }
        if (sd.newCapabilities?.length) {
          html += `<div class="upd-section-label" style="color:#00c4ff;margin-top:4px;">New Capabilities</div>`;
          html += sd.newCapabilities
            .map(
              (c) => `<div class="upd-new-cap">
        <div style="font-size:12px;font-weight:700;color:#e2e8f0;margin-bottom:3px;">${c.name}</div>
        <div style="font-size:10px;color:#7c3aed;margin-bottom:5px;">${c.model} via ${c.provider}</div>
        <div style="font-size:11px;color:#94a3b8;margin-bottom:3px;">${c.description}</div>
        <div style="font-size:10px;color:#64748b;font-style:italic;">${c.use_case}</div>
      </div>`,
            )
            .join("");
        }
        if (sd.newProviders?.length) {
          html += `<div class="upd-section-label" style="color:#22c55e;margin-top:4px;">New Providers</div>`;
          html += sd.newProviders
            .map(
              (p) => `<div class="upd-model-card">
        <div style="font-size:12px;font-weight:700;color:#e2e8f0;margin-bottom:3px;">${p.name}</div>
        <div style="font-size:11px;color:#94a3b8;margin-bottom:3px;">${p.description}</div>
        <div style="font-size:10px;color:#22c55e;">Best for: ${p.bestFor}</div>
      </div>`,
            )
            .join("");
        }
        html += `<div style="text-align:center;margin-top:8px;"><button id="updScanBtn" onclick="runAIScan()" style="background:rgba(124,58,237,.18);border:1px solid rgba(124,58,237,.3);color:#a78bfa;padding:7px 18px;border-radius:8px;font-size:11px;cursor:pointer;font-weight:700;">↺ Re-scan</button></div>`;
        body.innerHTML =
          html ||
          '<div style="color:#64748b;font-size:12px;text-align:center;padding:20px;">No recommendations found.</div>';
      }
    }

    // Auto-check on startup (60s delay so server is warm)
    setTimeout(() => {
      fetch("/api/system-updates")
        .then((r) => r.json())
        .then((d) => {
          _upd.data = d;
          _updRefreshBadge();
        })
        .catch(() => {});
    }, 60000);
    // Re-check every 6 hours
    setInterval(
      () => {
        fetch("/api/system-updates")
          .then((r) => r.json())
          .then((d) => {
            _upd.data = d;
            _updRefreshBadge();
          })
          .catch(() => {});
      },
      6 * 60 * 60 * 1000,
    );

    /* ── SITE RULEBOOK ── */
    function toggleRulebook() {
      const m = document.getElementById("rulebookModal");
      m.style.display = m.style.display === "flex" ? "none" : "flex";
    }

    async function applyLocalRulebookPlaceholders() {
      try {
        const res = await fetch("/api/rulebook-local-placeholder", {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok || !data.success)
          throw new Error(
            data.error || "Rulebook local placeholder action failed",
          );
        const integrity = data.scanIntegrity || {};
        const msg = [
          "Local placeholder actions applied.",
          `Rulebook blockers: ${(integrity.rulebook?.blockers || []).length}`,
          `Scan ok: ${integrity.ok === true ? "yes" : "no"}`,
          `3D model fallback status: ${integrity.broken3dModel ? "missing" : "ok"}`,
        ].join("\n");
        alert(msg);
        const last = document.getElementById("ddLastScan");
        if (last)
          last.textContent = `Rulebook local placeholder applied at ${new Date().toLocaleTimeString()}`;
        refreshSystemPanels();
      } catch (err) {
        alert(`Local placeholder action error: ${err.message}`);
      }
    }

    function monitorSafe(v, fallback = "--") {
      return v === null || v === undefined || v === "" ? fallback : v;
    }

    let monitorTopOpenAlertId = null;

    async function refreshMonitoringLogs() {
      try {
        const cat =
          document.getElementById("monLogCategory")?.value || "system";
        const sev = document.getElementById("monLogSeverity")?.value || "";
        const since = Date.now() - 60 * 60 * 1000;
        const qs = new URLSearchParams({
          category: cat,
          limit: "120",
          since: String(since),
        });
        if (sev) qs.set("severity", sev);
        const res = await fetch(`/api/monitoring/logs?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok || !data.success)
          throw new Error(data.error || "logs failed");
        const rows = data.logs || [];
        const el = document.getElementById("monLogsList");
        if (!el) return;
        if (!rows.length) {
          el.innerHTML =
            '<div style="color:#64748b;">No logs for selected filter.</div>';
          return;
        }
        el.innerHTML = rows
          .slice(-20)
          .reverse()
          .map((r) => {
            const t = new Date(
              r.timestamp || Date.now(),
            ).toLocaleTimeString();
            const sevLabel = String(r.severity || "info").toUpperCase();
            const color =
              sevLabel === "ERROR" || sevLabel === "CRITICAL"
                ? "#fca5a5"
                : sevLabel === "WARN"
                  ? "#fde68a"
                  : "#93c5fd";
            return `<div style="padding:5px;border:1px solid rgba(255,255,255,.08);border-radius:6px;background:rgba(0,0,0,.14);">
        <div style="display:flex;justify-content:space-between;gap:8px;"><span style="color:${color};font-weight:700;">${sevLabel}</span><span style="color:#64748b;">${t}</span></div>
        <div style="color:#cbd5e1;">${monitorSafe(r.message, "event")}</div>
      </div>`;
          })
          .join("");
      } catch (e) {
        const el = document.getElementById("monLogsList");
        if (el)
          el.innerHTML = `<div style="color:#fca5a5;">Logs error: ${e.message}</div>`;
      }
    }

    async function resolveMonitoringAlert(id) {
      try {
        await fetch(
          `/api/monitoring/alerts/${encodeURIComponent(id)}/resolve`,
          { method: "POST" },
        );
        await refreshMonitoringDashboard();
      } catch (_) {}
    }

    async function acknowledgeTopMonitoringAlert() {
      try {
        if (!monitorTopOpenAlertId) {
          alert("No open monitoring alert to acknowledge.");
          return;
        }
        await fetch(
          `/api/monitoring/alerts/${encodeURIComponent(monitorTopOpenAlertId)}/ack`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "acknowledged" }),
          },
        );
        await refreshMonitoringDashboard();
      } catch (e) {
        alert(`Acknowledge alert failed: ${e.message}`);
      }
    }

    async function resolveTopMonitoringAlert() {
      try {
        if (!monitorTopOpenAlertId) {
          alert("No open monitoring alert to resolve.");
          return;
        }
        await resolveMonitoringAlert(monitorTopOpenAlertId);
      } catch (e) {
        alert(`Resolve alert failed: ${e.message}`);
      }
    }

    async function refreshMonitoringDashboard() {
      try {
        const res = await fetch("/api/monitoring/summary");
        const data = await res.json();
        if (!res.ok || !data.success)
          throw new Error(data.error || "monitoring summary failed");

        const sys = data.systemHealth || {};
        const ai = data.ai || {};
        const tel = data.telemetry || {};
        const sec = data.security || {};
        const users = data.users || {};

        const sysLabel = `${monitorSafe(sys.errorRatePct, 0)}% err • ${monitorSafe(sys.responseTimeMs, 0)}ms`;
        document.getElementById("monSystemHealth").textContent = sysLabel;
        document.getElementById("monAiCycle").textContent =
          `${monitorSafe(ai.cycleStatus, "idle")} • q=${monitorSafe(ai.taskQueueLength, 0)}`;
        document.getElementById("monGpuCpu").textContent =
          `${monitorSafe(tel.gpuUtilizationPct, "--")}% / ${monitorSafe(tel.cpuUtilizationPct, "--")}%`;
        const secState =
          sec.internet || sec.wifi || sec.bluetooth ? "elevated" : "locked";
        document.getElementById("monSecurity").textContent =
          `${secState} • fw:${sec.firewall ? "on" : "off"}`;
        document.getElementById("monActiveUsers").textContent =
          `${monitorSafe(users.activeUsers, 0)} now • ${monitorSafe(users.totalVisitorsToday, 0)} today`;

        const topOpenAlerts = (data.alerts || []).filter(
          (a) => a.status === "open",
        );
        monitorTopOpenAlertId = topOpenAlerts.length
          ? String(topOpenAlerts[0].id || "")
          : null;
        const topSystem = document.getElementById("monTopSystem");
        const topAi = document.getElementById("monTopAi");
        const topSec = document.getElementById("monTopSec");
        const topUsers = document.getElementById("monTopUsers");
        const topAlerts = document.getElementById("monTopAlerts");
        if (topSystem)
          topSystem.textContent = `${monitorSafe(sys.errorRatePct, 0)}%/${monitorSafe(sys.responseTimeMs, 0)}ms`;
        if (topAi)
          topAi.textContent = `${monitorSafe(ai.cycleStatus, "idle")} q:${monitorSafe(ai.taskQueueLength, 0)}`;
        if (topSec)
          topSec.textContent = `${secState}${sec.firewall ? "" : " fw-off"}`;
        if (topUsers)
          topUsers.textContent = `${monitorSafe(users.activeUsers, 0)} live`;
        if (topAlerts) topAlerts.textContent = `${topOpenAlerts.length} open`;

        const setTxt = (id, value) => {
          const el = document.getElementById(id);
          if (el) el.textContent = value;
        };
        const isOn = (v) => (v ? "ON" : "OFF");
        const containment = topOpenAlerts.some(
          (a) => String(a.severity || "").toLowerCase() === "critical",
        )
          ? "ALERT"
          : sec.internet
            ? "RESTRICTED"
            : "LOCAL-ONLY";
        const cycleUpper = String(
          monitorSafe(ai.cycleStatus, "idle"),
        ).toUpperCase();
        const activeUsers = String(monitorSafe(users.activeUsers, 0));

        setTxt("secTopFirewall", isOn(!!sec.firewall));
        setTxt("secTopInternet", isOn(!!sec.internet));
        setTxt("secTopWifi", isOn(!!sec.wifi));
        setTxt("secTopBluetooth", isOn(!!sec.bluetooth));
        setTxt(
          "secTopSignal",
          isOn(sec.signalBlocker == null ? true : !!sec.signalBlocker),
        );
        setTxt("secTopContainment", containment);
        setTxt("secTopCycle", cycleUpper);
        setTxt("secTopUsers", activeUsers);

        setTxt("secBarFirewall", isOn(!!sec.firewall));
        setTxt("secBarInternet", isOn(!!sec.internet));
        setTxt("secBarWifi", isOn(!!sec.wifi));
        setTxt("secBarBluetooth", isOn(!!sec.bluetooth));
        setTxt(
          "secBarSignal",
          isOn(sec.signalBlocker == null ? true : !!sec.signalBlocker),
        );
        setTxt("secBarContainment", containment);
        setTxt("secBarCycle", cycleUpper);
        setTxt("secBarUsers", activeUsers);

        setTxt(
          "secNetworkState",
          `Inbound ${monitorSafe(tel.requestsPerMinute, 0)} rpm • Outbound monitored • Suspicious IPs ${sec.suspiciousIpCount || 0} • Rate limiting ${sec.rateLimiting ? "active" : "guarded"}`,
        );
        setTxt(
          "secWirelessState",
          `WiFi ${isOn(!!sec.wifi)} • Bluetooth ${isOn(!!sec.bluetooth)} • NFC ${isOn(!!sec.nfc)} • Signal blocker ${isOn(sec.signalBlocker == null ? true : !!sec.signalBlocker)}`,
        );
        setTxt(
          "secInternetState",
          `External API calls ${monitorSafe(tel.externalCalls, 0)} • Blocked calls ${sec.blockedOutboundCalls || 0} • AI internet attempts ${sec.aiInternetAttempts || 0}`,
        );

        setTxt("secAiContainment", containment);
        setTxt("secAiDenied", String(sec.aiDeniedActions || 0));
        setTxt(
          "secAiApproved",
          String(sec.aiApprovedActions || monitorSafe(ai.taskQueueLength, 0)),
        );
        setTxt("secAiRepair", String(sec.aiSelfRepairEvents || 0));
        setTxt("secAiUpgrade", String(sec.aiSelfUpgradeEvents || 0));
        setTxt(
          "secAiCycleLogs",
          `${cycleUpper} • q=${monitorSafe(ai.taskQueueLength, 0)}`,
        );

        const domains = (data.domainHealth || []).slice(0, 14);
        const brokenTotal = domains.reduce((sum, d) => {
          return (
            sum +
            Number(d.brokenImagesCount || 0) +
            Number(d.brokenChartsCount || 0) +
            Number(d.broken3dModelsCount || 0)
          );
        }, 0);
        const missingTotal = domains.reduce(
          (sum, d) => sum + Number(d.missingSummariesOrPictures || 0),
          0,
        );
        setTxt(
          "secCodeIntegrity",
          `${monitorSafe(sys.errorRatePct, 0)}% err • ${monitorSafe(sys.responseTimeMs, 0)}ms`,
        );
        setTxt("secBrokenAssets", String(brokenTotal));
        setTxt("secMissing", String(missingTotal));
        setTxt(
          "secLastScan",
          data.lastScanAt
            ? new Date(data.lastScanAt).toLocaleTimeString()
            : "continuous",
        );
        setTxt(
          "secLastRepair",
          data.lastRepairAt
            ? new Date(data.lastRepairAt).toLocaleTimeString()
            : "auto",
        );

        const alertsEl = document.getElementById("monAlertsList");
        const openAlerts = topOpenAlerts.slice(0, 8);
        if (alertsEl) {
          if (!openAlerts.length) {
            alertsEl.innerHTML =
              '<div style="color:#86efac;">No open alerts.</div>';
          } else {
            alertsEl.innerHTML = openAlerts
              .map((a) => {
                const tint =
                  a.severity === "critical"
                    ? "#fda4af"
                    : a.severity === "high"
                      ? "#fecaca"
                      : "#fde68a";
                return `<div style="padding:6px;border:1px solid rgba(255,255,255,.08);border-radius:6px;background:rgba(0,0,0,.12);">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
              <span style="color:${tint};font-weight:700;">${String(a.severity || "info").toUpperCase()}</span>
              <button onclick="resolveMonitoringAlert('${String(a.id || "").replace(/'/g, "")}')" style="font-size:9px;padding:2px 6px;border-radius:999px;border:1px solid rgba(34,197,94,.35);background:rgba(34,197,94,.1);color:#86efac;cursor:pointer;">resolve</button>
            </div>
            <div style="color:#e2e8f0;">${monitorSafe(a.message, "alert")}</div>
          </div>`;
              })
              .join("");
          }
        }

        const domainEl = document.getElementById("monDomainList");
        if (domainEl) {
          domainEl.innerHTML = domains
            .map((d) => {
              const bad =
                (d.brokenImagesCount || 0) +
                (d.brokenChartsCount || 0) +
                (d.broken3dModelsCount || 0) +
                (d.missingSummariesOrPictures || 0);
              const c = bad > 0 ? "#fca5a5" : "#86efac";
              return `<div style="display:flex;justify-content:space-between;gap:8px;"><span style="color:#cbd5e1;">${d.id}</span><span style="color:${c};font-weight:700;">${bad > 0 ? `issues:${bad}` : "ok"}</span></div>`;
            })
            .join("");
        }

        const securityDomainGrid =
          document.getElementById("securityDomainGrid");
        if (securityDomainGrid) {
          const defaultDomains = [
            "AI",
            "Medicine",
            "Energy",
            "Materials",
            "Neuro",
            "Space",
            "Security",
            "Govern",
            "Build",
            "Cosm",
            "Intel",
            "Robotics",
            "3D Printing",
            "Automation Jobs",
          ];
          const byId = new Map(
            (domains || []).map((d) => [String(d.id || "").toLowerCase(), d]),
          );
          const source = defaultDomains.map((name) => {
            const hit =
              byId.get(name.toLowerCase()) ||
              byId.get(name.replace(" ", "-").toLowerCase()) ||
              byId.get(name.replace(" ", "").toLowerCase());
            return (
              hit || {
                id: name,
                brokenImagesCount: 0,
                brokenChartsCount: 0,
                broken3dModelsCount: 0,
                missingSummariesOrPictures: 0,
              }
            );
          });
          securityDomainGrid.innerHTML = source
            .map((d) => {
              const bad =
                Number(d.brokenImagesCount || 0) +
                Number(d.brokenChartsCount || 0) +
                Number(d.broken3dModelsCount || 0) +
                Number(d.missingSummariesOrPictures || 0);
              const state = bad > 0 ? "issues" : "ok";
              const color = bad > 0 ? "#fca5a5" : "#86efac";
              return `<div style="padding:8px;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(2,6,23,.45);">
          <div style="display:flex;justify-content:space-between;gap:8px;"><b style="color:#e2e8f0;">${String(d.id || "").toUpperCase()}</b><span style="color:${color};font-weight:700;">${state}</span></div>
          <div style="margin-top:4px;color:#94a3b8;line-height:1.5;">Errors: ${bad}<br/>Broken components: ${bad}<br/>Last scan: continuous<br/>Logs: monitored</div>
        </div>`;
            })
            .join("");
        }

        await refreshMonitoringLogs();
      } catch (e) {
        const alertsEl = document.getElementById("monAlertsList");
        if (alertsEl)
          alertsEl.innerHTML = `<div style="color:#fca5a5;">Monitoring error: ${e.message}</div>`;
      }
    }

    function getMonitoringSessionId() {
      const key = "monitoringSessionId";
      try {
        let id = localStorage.getItem(key);
        if (!id) {
          id = `site-${Math.random().toString(36).slice(2, 10)}`;
          localStorage.setItem(key, id);
        }
        return id;
      } catch {
        return `site-${Math.random().toString(36).slice(2, 10)}`;
      }
    }

    async function reportMonitoringActivity(
      eventType = "view",
      tileId = null,
    ) {
      try {
        await fetch("/api/monitoring/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: getMonitoringSessionId(),
            path: location.pathname,
            domain: location.hash || "main",
            eventType,
            tileId,
          }),
        });
      } catch (_) {}
    }

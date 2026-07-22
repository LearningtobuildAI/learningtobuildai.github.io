const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const chatModeHint = document.getElementById("chatModeHint");
const providerButtons = document.querySelectorAll(".provider-btn");
const revisionStatus = document.getElementById("revisionStatus");
const reloadToast = document.getElementById("reloadToast");
const toggleSplitBtn = document.getElementById("toggleSplitBtn");
const followChatBtn = document.getElementById("followChatBtn");
const runStatusReportBtn = document.getElementById("runStatusReportBtn");
const opsTabs = document.querySelectorAll(".ops-tab");
const opsPanes = document.querySelectorAll(".ops-pane");
const branchButtons = document.querySelectorAll(".branch-btn");
const openConversationBtn = document.getElementById("openConversationBtn");
const refreshSystemBtn = document.getElementById("refreshSystemBtn");
const selfRepairScanBtn = document.getElementById("selfRepairScanBtn");
const selfRepairExecuteBtn = document.getElementById("selfRepairExecuteBtn");
const goBranchBtn = document.getElementById("goBranchBtn");
const refreshBridgeBtn = document.getElementById("refreshBridgeBtn");
const sysHealthScore = document.getElementById("sysHealthScore");
const sysDomainCoverage = document.getElementById("sysDomainCoverage");
const sysIntelCards = document.getElementById("sysIntelCards");
const sysPhotoCoverage = document.getElementById("sysPhotoCoverage");
const sysRevisionState = document.getElementById("sysRevisionState");
const sysServerStarted = document.getElementById("sysServerStarted");
const sysGpuLive = document.getElementById("sysGpuLive");
const sysMissingPhotos = document.getElementById("sysMissingPhotos");
const sysSelfRepairState = document.getElementById("sysSelfRepairState");
const sysSelfRepairIssues = document.getElementById("sysSelfRepairIssues");
const bridgeOnlineState = document.getElementById("bridgeOnlineState");
const bridgeResponseMs = document.getElementById("bridgeResponseMs");
const bridgeHealthLatency = document.getElementById("bridgeHealthLatency");
const bridgeModelLoaded = document.getElementById("bridgeModelLoaded");
const bridgeMemoryActive = document.getElementById("bridgeMemoryActive");
const bridgeAgentActive = document.getElementById("bridgeAgentActive");
const bridgeErrorCount = document.getElementById("bridgeErrorCount");
const bridgeLogCount = document.getElementById("bridgeLogCount");
const bridgePortStatus = document.getElementById("bridgePortStatus");
const bridgeTarget = document.getElementById("bridgeTarget");
const bridgeLastError = document.getElementById("bridgeLastError");
const siteFixesList = document.getElementById("siteFixesList");
const refreshFixesBtn = document.getElementById("refreshFixesBtn");
const autoFixAllBtn = document.getElementById("autoFixAllBtn");
const algalonGraphStatus = document.getElementById("algalonGraphStatus");
const historyProviderFilter = document.getElementById("historyProviderFilter");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const templateSelect = document.getElementById("templateSelect");
const templateDomain = document.getElementById("templateDomain");
const templateGoal = document.getElementById("templateGoal");
const templateText = document.getElementById("templateText");
const saveTemplateBtn = document.getElementById("saveTemplateBtn");
const useTemplateBtn = document.getElementById("useTemplateBtn");
const deleteTemplateBtn = document.getElementById("deleteTemplateBtn");
let selectedProvider = "algalon";
let ariaWs = null;
let ariaSid = "admin-chat-" + Math.random().toString(36).slice(2, 8);
let ariaReady = false;
let ariaCurrentBody = null;
let ariaToolContainer = null;
let lastRevision = null;
let pendingAriaPrompt = "";
let followModeEnabled = localStorage.getItem("algalonFollowMode") === "1";
let bridgePollInflight = false;

const CHAT_HISTORY_KEY = "adminChatHistoryV2";
const CHAT_TEMPLATES_KEY = "adminChatTemplatesV1";
const SHARED_CHAT_PROVIDER_KEY = "site_chat_provider_v1";
const SHARED_CHAT_MODE_KEY = "site_chat_mode_v1";
const DEFAULT_TEMPLATES = [
  {
    name: "Domain Gap Audit",
    text: "Run a full gap audit on {domain} focused on {goal}. Return top 10 missing items and concrete fixes.",
  },
  {
    name: "UX Improvement Sprint",
    text: "Review {domain} section for {goal}. Propose and apply 3 UX improvements with clear rationale.",
  },
  {
    name: "Ranking Validation",
    text: "Fact-check {domain} ranking for {goal}. Verify claims, scores, and source confidence.",
  },
];

const PROVIDER_HINTS = {
  guide:
    "AI Team is active. Ask for platform guidance, domain comparisons, or analysis across the active domain stack.",
  admin:
    "Super AI is active. Use this mode for multi-agent site reasoning, action extraction, and admin-grade planning.",
  algalon:
    "Algalon Core is active inside admin chat. Use this for observer-level strategic audits while the external Algalon interface remains available on the main platform.",
  aria: "ARIA Agent is active. This mode can connect to the local ARIA runtime for computer control and file workflow tasks.",
  code: "Code mode is active. Use it for implementation questions, debugging, and code generation.",
  edit: "Edit Site mode is active. Describe a concrete page change and the site editor will apply it. The page will refresh automatically after edits land.",
};

function writeSharedProvider(provider) {
  try {
    localStorage.setItem(SHARED_CHAT_PROVIDER_KEY, JSON.stringify(provider));
  } catch {}
  window.dispatchEvent(
    new CustomEvent("site-chat-provider-change", {
      detail: { provider },
    }),
  );
}

function readSharedMode() {
  try {
    return JSON.parse(localStorage.getItem(SHARED_CHAT_MODE_KEY) || '"guide"');
  } catch {
    return "guide";
  }
}

function initAlgalonLiveGraph() {
  const canvas = document.getElementById("algalonLiveGraph");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const nodes = Array.from({ length: 28 }, (_, i) => ({
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.75,
    vy: (Math.random() - 0.5) * 0.75,
    r: 2 + Math.random() * 2.6,
    phase: Math.random() * Math.PI * 2,
    g: i % 3,
  }));

  let tick = 0;

  function draw() {
    tick += 1;
    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "rgba(2,6,23,0.86)");
    bg.addColorStop(1, "rgba(5,12,32,0.92)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d > 170) continue;
        const alpha = (1 - d / 170) * (a.g === b.g ? 0.35 : 0.18);
        ctx.strokeStyle =
          a.g === b.g
            ? `rgba(56,189,248,${alpha})`
            : `rgba(129,140,248,${alpha})`;
        ctx.lineWidth = a.g === b.g ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    for (const n of nodes) {
      const pulse = 0.55 + 0.45 * Math.sin(tick / 20 + n.phase);
      const color = n.g === 0 ? "#38bdf8" : n.g === 1 ? "#818cf8" : "#22d3ee";
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.2 * pulse;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (algalonGraphStatus && tick % 120 === 0) {
      const states = [
        "Node Flux Active",
        "Topology Syncing",
        "Inference Mesh Stable",
      ];
      algalonGraphStatus.textContent =
        states[((tick / 120) % states.length) | 0];
    }

    requestAnimationFrame(draw);
  }

  draw();
}

function updateFollowUi() {
  if (!followChatBtn) return;
  followChatBtn.textContent = followModeEnabled
    ? "Follow Mode: On"
    : "Follow Chat Window";
  followChatBtn.style.borderColor = followModeEnabled
    ? "rgba(34,197,94,.34)"
    : "rgba(255,255,255,.1)";
  followChatBtn.style.background = followModeEnabled
    ? "rgba(34,197,94,.12)"
    : "rgba(255,255,255,.04)";
  followChatBtn.style.color = followModeEnabled ? "#bbf7d0" : "#e2e8f0";
}

function openFollowChatWindow() {
  const features =
    "width=470,height=780,left=120,top=80,resizable=yes,scrollbars=yes";
  const popup = window.open(
    "/admin-chat.html?follow=1",
    "algalonChatWindow",
    features,
  );
  if (popup) {
    localStorage.setItem("algalonFollowMode", "1");
    followModeEnabled = true;
    updateFollowUi();
    popup.focus();
  }
}

function setSplitMode(enabled) {
  document.body.classList.toggle("split-mode", enabled);
  localStorage.setItem("adminChatSplitMode", enabled ? "1" : "0");
  toggleSplitBtn.textContent = enabled ? "Single Pane" : "Split View";
  if (enabled) activatePane("conversation");
}

toggleSplitBtn?.addEventListener("click", () => {
  const isEnabled = document.body.classList.contains("split-mode");
  setSplitMode(!isEnabled);
});

followChatBtn?.addEventListener("click", () => {
  if (followModeEnabled) {
    followModeEnabled = false;
    localStorage.setItem("algalonFollowMode", "0");
    updateFollowUi();
    return;
  }
  openFollowChatWindow();
});

function activatePane(name) {
  opsTabs.forEach((tab) =>
    tab.classList.toggle("active", tab.dataset.pane === name),
  );
  opsPanes.forEach((pane) =>
    pane.classList.toggle("active", pane.id === `pane-${name}`),
  );
}

opsTabs.forEach((tab) => {
  tab.addEventListener("click", () => activatePane(tab.dataset.pane));
});

function setProvider(provider) {
  const target = document.querySelector(
    `.provider-btn[data-provider="${provider}"]`,
  );
  if (target) target.click();
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistoryEntry(entry) {
  const next = [entry, ...getHistory()].slice(0, 120);
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(next));
  renderHistory();
}

function renderHistory() {
  const filter = historyProviderFilter?.value || "all";
  const rows = getHistory().filter(
    (item) => filter === "all" || item.provider === filter,
  );
  if (!rows.length) {
    historyList.innerHTML =
      '<div class="history-row"><div class="history-row-prompt">No executions logged for this provider yet.</div></div>';
    return;
  }
  historyList.innerHTML = rows
    .slice(0, 40)
    .map((item) => {
      const when = new Date(item.ts).toLocaleString();
      return `<div class="history-row">
          <div class="history-row-head"><span>${item.label}</span><span>${when}</span></div>
          <div class="history-row-prompt"><strong>Prompt:</strong> ${renderMd(item.prompt || "")}</div>
          <div class="history-row-result"><strong>Result:</strong> ${renderMd(item.result || "")}</div>
        </div>`;
    })
    .join("");
}

function getTemplates() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(CHAT_TEMPLATES_KEY) || "null",
    );
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_TEMPLATES;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

function saveTemplates(templates) {
  localStorage.setItem(CHAT_TEMPLATES_KEY, JSON.stringify(templates));
}

function renderTemplateSelect() {
  const templates = getTemplates();
  templateSelect.innerHTML = templates
    .map((tpl, i) => `<option value="${i}">${tpl.name}</option>`)
    .join("");
  const selected = templates[0];
  if (selected) {
    templateText.value = selected.text;
  }
}

function applyTemplateToPrompt() {
  const source = templateText.value || "";
  const domain = (templateDomain.value || "selected domain").trim();
  const goal = (templateGoal.value || "priority objectives").trim();
  const prompt = source
    .replaceAll("{domain}", domain)
    .replaceAll("{goal}", goal);
  setProvider("admin");
  activatePane("conversation");
  chatInput.value = prompt;
  chatInput.focus();
}

templateSelect?.addEventListener("change", () => {
  const templates = getTemplates();
  const selected = templates[Number(templateSelect.value)] || templates[0];
  if (selected) templateText.value = selected.text;
});

saveTemplateBtn?.addEventListener("click", () => {
  const templates = getTemplates();
  const idx = Number(templateSelect.value);
  const currentName =
    templates[idx]?.name || `Template ${templates.length + 1}`;
  const updated = [...templates];
  if (updated[idx]) {
    updated[idx] = {
      ...updated[idx],
      text: templateText.value || updated[idx].text,
    };
  } else {
    updated.push({ name: currentName, text: templateText.value || "" });
  }
  saveTemplates(updated);
  renderTemplateSelect();
});

useTemplateBtn?.addEventListener("click", applyTemplateToPrompt);

deleteTemplateBtn?.addEventListener("click", () => {
  const templates = getTemplates();
  if (templates.length <= 1) return;
  const idx = Number(templateSelect.value);
  templates.splice(idx, 1);
  saveTemplates(templates);
  renderTemplateSelect();
});

historyProviderFilter?.addEventListener("change", renderHistory);
clearHistoryBtn?.addEventListener("click", () => {
  localStorage.setItem(CHAT_HISTORY_KEY, "[]");
  renderHistory();
});

branchButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const provider = btn.dataset.provider || "admin";
    const prompt = btn.dataset.prompt || "";
    setProvider(provider);
    chatInput.value = prompt;
    activatePane("conversation");
    chatInput.focus();
  });
});

openConversationBtn?.addEventListener("click", () =>
  activatePane("conversation"),
);
goBranchBtn?.addEventListener("click", () => activatePane("branches"));
runStatusReportBtn?.addEventListener("click", () => {
  setProvider("admin");
  activatePane("conversation");
  chatInput.value =
    "SYSTEM DIRECTIVE full ai self-assessment and upgrade checklist. Include SECTION 1 current ability report, SECTION 2 performance level, SECTION 3 copilot / claude gap analysis, SECTION 4 extended upgrade checklist, SECTION 5 priority roadmap, SECTION 6 final summary. Include current level estimate and target level check.";
  sendPrompt();
});

const SITE_FIX_ITEMS = [
  {
    id: "chat-top",
    title: "Top Chat Dock + Status Strip",
    status: "in-progress",
    lastCheck: "pending",
    detail: "Awaiting backend check",
    prompt:
      "Validate top chat dock and status strip sync across runtime states. Fix any missing ids, stale level/xp values, and prompt send failures.",
  },
  {
    id: "gpu-colors",
    title: "GPU Color Logic Public/Admin",
    status: "in-progress",
    lastCheck: "pending",
    detail: "Awaiting backend check",
    prompt:
      "Run GPU color-state parity check. Ensure green/yellow/red thresholds match in public and admin views and correct any mismatch.",
  },
  {
    id: "charts-health",
    title: "Live Chart Module Health",
    status: "in-progress",
    lastCheck: "pending",
    detail: "Awaiting backend check",
    prompt:
      "Audit chart health states and fallback rendering. Fix no-data and offline behavior in domain charts.",
  },
  {
    id: "power-visuals",
    title: "Power/Battery Visual Rebuild",
    status: "in-progress",
    lastCheck: "pending",
    detail: "Awaiting backend check",
    prompt:
      "Validate power and battery visual cards, image binding, and table coherence. Fix missing visuals and alignment issues.",
  },
  {
    id: "viewer-3d",
    title: "3D Algalon Viewer Fallback",
    status: "in-progress",
    lastCheck: "pending",
    detail: "Awaiting backend check",
    prompt:
      "Run 3D viewer diagnostic: glb/gltf loading, retry telemetry, and fallback mode. Apply safe fixes for model load errors.",
  },
  {
    id: "disease-index",
    title: "Disease Index Enrichment",
    status: "in-progress",
    lastCheck: "pending",
    detail: "Awaiting backend check",
    prompt:
      "Audit disease status index summary cards and table expansion integrity. Fix malformed entries and missing visual assignments.",
  },
];

function issueTone(status) {
  if (status === "done")
    return {
      color: "#4ade80",
      border: "rgba(74,222,128,.3)",
      label: "DONE",
    };
  if (status === "blocked")
    return {
      color: "#ef4444",
      border: "rgba(239,68,68,.3)",
      label: "BLOCKED",
    };
  return {
    color: "#f59e0b",
    border: "rgba(245,158,11,.3)",
    label: "IN PROGRESS",
  };
}

function renderSiteFixes() {
  if (!siteFixesList) return;
  siteFixesList.innerHTML = SITE_FIX_ITEMS.map((item, idx) => {
    const tone = issueTone(item.status);
    return `<div class="system-row" style="align-items:flex-start;gap:12px;border-color:${tone.border};">
          <div style="flex:1;min-width:0;">
            <strong style="color:${tone.color};font-size:10px;letter-spacing:.12em;">${tone.label}</strong>
            <div style="font-size:12px;color:#e2e8f0;margin-top:4px;">${item.title}</div>
            <div style="font-size:11px;color:#cbd5e1;margin-top:4px;">${item.detail || "No detail"}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Last check: ${item.lastCheck}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button type="button" class="ghost-btn" onclick="markFixChecked(${idx})">Fix</button>
            <button type="button" class="ghost-btn" onclick="autoFixItem(${idx})">Auto</button>
          </div>
        </div>`;
  }).join("");
}

window.markFixChecked = function (idx) {
  const item = SITE_FIX_ITEMS[idx];
  if (!item) return;
  setProvider("admin");
  activatePane("conversation");
  chatInput.value = item.prompt;
  sendPrompt();
};

window.autoFixItem = function (idx) {
  const item = SITE_FIX_ITEMS[idx];
  if (!item) return;
  setProvider("admin");
  activatePane("conversation");
  chatInput.value = `APPROVED FOR LIVE. ${item.prompt} Return concise diff summary and residual risks.`;
  sendPrompt();
};

function applyBackendFixState(health, runtime, rev) {
  const now = new Date().toLocaleString();
  const domainPresent = (health?.domainHealth || []).filter(
    (d) => d.present,
  ).length;
  const domainTotal = (health?.domainHealth || []).length || 14;
  const gpu = Number.isFinite(runtime?.gpu?.livePercent)
    ? runtime.gpu.livePercent
    : runtime?.gpu?.fallbackPercent;

  SITE_FIX_ITEMS.forEach((item) => {
    item.lastCheck = now;
    item.status = "in-progress";
    item.detail = "Check in progress";
  });

  const chatTop = SITE_FIX_ITEMS.find((i) => i.id === "chat-top");
  if (chatTop) {
    const hasRevision = Number.isFinite(Number(rev?.revision));
    chatTop.status = hasRevision ? "done" : "blocked";
    chatTop.detail = hasRevision
      ? `Revision active (${Math.round(Number(rev.revision))})`
      : "No client revision from backend";
  }

  const gpuFix = SITE_FIX_ITEMS.find((i) => i.id === "gpu-colors");
  if (gpuFix) {
    if (Number.isFinite(gpu)) {
      gpuFix.status = "done";
      gpuFix.detail = `GPU telemetry live at ${gpu}%`;
    } else {
      gpuFix.status = "blocked";
      gpuFix.detail = "GPU telemetry unavailable";
    }
  }

  const chartFix = SITE_FIX_ITEMS.find((i) => i.id === "charts-health");
  if (chartFix) {
    const hasDomains =
      domainPresent >= Math.max(8, Math.floor(domainTotal * 0.6));
    chartFix.status = hasDomains ? "done" : "blocked";
    chartFix.detail = `Domain health ${domainPresent}/${domainTotal}`;
  }

  const powerFix = SITE_FIX_ITEMS.find((i) => i.id === "power-visuals");
  if (powerFix) {
    const photoScore = Number(health?.photoScore || 0);
    powerFix.status = photoScore >= 80 ? "done" : "in-progress";
    powerFix.detail = `Photo coverage ${health?.assignedSlots ?? "--"}/${health?.totalSlots ?? "--"} (${photoScore}%)`;
  }

  const viewerFix = SITE_FIX_ITEMS.find((i) => i.id === "viewer-3d");
  if (viewerFix) {
    const runtimeLive = Boolean(runtime?.liveLocal?.online);
    viewerFix.status = runtimeLive ? "done" : "in-progress";
    viewerFix.detail = runtimeLive
      ? "Local runtime online for model service path"
      : "Runtime offline; viewer likely in fallback mode";
  }

  const diseaseFix = SITE_FIX_ITEMS.find((i) => i.id === "disease-index");
  if (diseaseFix) {
    const worldCards = Number(health?.worldIntelCards || 0);
    diseaseFix.status = worldCards >= 150 ? "done" : "in-progress";
    diseaseFix.detail = `World intelligence cards: ${worldCards}`;
  }
}

function paintSelfRepairStatus(report) {
  if (!sysSelfRepairState || !sysSelfRepairIssues) return;
  if (!report) {
    sysSelfRepairState.textContent = "No report yet";
    sysSelfRepairIssues.textContent = "--";
    sysSelfRepairState.style.color = "#94a3b8";
    return;
  }

  const mode = report?.layers?.execution === "enabled" ? "execute" : "scan";
  const issues = Number(report?.summary?.totalIssues || 0);
  const applied = Number(report?.summary?.repairsApplied || 0);
  const doneAt = report?.completedAt
    ? new Date(report.completedAt).toLocaleTimeString()
    : "--";
  sysSelfRepairState.textContent = `${mode.toUpperCase()} Â· ${doneAt}`;
  sysSelfRepairIssues.textContent = `${issues} issues Â· ${applied} repaired`;
  if (issues === 0) {
    sysSelfRepairState.style.color = "#4ade80";
  } else if (issues <= 10) {
    sysSelfRepairState.style.color = "#f59e0b";
  } else {
    sysSelfRepairState.style.color = "#f87171";
  }
}

function setBridgeValue(el, value, cls = "") {
  if (!el) return;
  el.textContent = value;
  if (el.classList.contains("bridge-kpi-value")) {
    el.classList.remove("good", "warn", "bad");
    if (cls) el.classList.add(cls);
  }
}

function classifyLatency(ms) {
  if (!Number.isFinite(ms)) return "bad";
  if (ms <= 120) return "good";
  if (ms <= 500) return "warn";
  return "bad";
}

async function refreshBridgeStatus() {
  if (bridgePollInflight) return;
  bridgePollInflight = true;
  try {
    const healthStart = performance.now();
    const healthRes = await fetch("/api/bridge/health", {
      cache: "no-store",
    });
    const healthMs = Math.round(performance.now() - healthStart);
    const health = await healthRes.json().catch(() => ({}));

    let aiMs = null;
    let ai = null;
    let aiErr = null;
    const pingStart = performance.now();
    try {
      const aiRes = await fetch("/api/bridge/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "status ping" }),
      });
      aiMs = Math.round(performance.now() - pingStart);
      ai = await aiRes.json().catch(() => ({}));
      if (!aiRes.ok) aiErr = ai?.error || `HTTP ${aiRes.status}`;
    } catch (error) {
      aiMs = Math.round(performance.now() - pingStart);
      aiErr = error.message || "Bridge AI request failed";
    }

    const [runtime, agents, memoryGraph, evoLog] = await Promise.all([
      fetch("/api/chat-runtime-status", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({})),
      fetch("/api/agent-status", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({ agents: [] })),
      fetch("/api/cross-domain", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({})),
      fetch("/api/evolution-log?limit=30", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({ log: [] })),
    ]);

    const online = Boolean(health?.ok) && !aiErr;
    setBridgeValue(
      bridgeOnlineState,
      online ? "Online" : "Offline",
      online ? "good" : "bad",
    );
    setBridgeValue(
      bridgeResponseMs,
      Number.isFinite(aiMs) ? `${aiMs} ms` : "-- ms",
      classifyLatency(aiMs),
    );
    setBridgeValue(
      bridgeHealthLatency,
      Number.isFinite(healthMs) ? `${healthMs} ms` : "-- ms",
      classifyLatency(healthMs),
    );

    const modelHint =
      runtime?.liveHostedCpu?.detail ||
      runtime?.liveLocal?.detail ||
      health?.upstream?.torch_version ||
      "Unknown";
    bridgeModelLoaded.textContent = String(modelHint || "Unknown");

    const memEntities = Array.isArray(memoryGraph?.entities)
      ? memoryGraph.entities.length
      : 0;
    bridgeMemoryActive.textContent =
      memEntities > 0 ? `Active (${memEntities} entities)` : "Idle";
    bridgeMemoryActive.style.color = memEntities > 0 ? "#4ade80" : "#f59e0b";

    const runningAgents = Array.isArray(agents?.agents)
      ? agents.agents.filter((a) => a.status === "running").length
      : 0;
    bridgeAgentActive.textContent =
      runningAgents > 0 ? `${runningAgents} running` : "0 running";
    bridgeAgentActive.style.color = runningAgents > 0 ? "#4ade80" : "#94a3b8";

    const logs = Array.isArray(evoLog?.log) ? evoLog.log : [];
    const errors = logs.filter((item) =>
      String(item?.status || "")
        .toLowerCase()
        .includes("error"),
    ).length;
    bridgeLogCount.textContent = String(logs.length);
    bridgeErrorCount.textContent = String(errors + (aiErr ? 1 : 0));
    bridgeErrorCount.style.color =
      errors + (aiErr ? 1 : 0) > 0 ? "#f87171" : "#4ade80";

    const target = String(health?.target || ai?.target || "--");
    bridgeTarget.textContent = target;
    bridgePortStatus.textContent = online ? "Open" : "Closed";
    bridgePortStatus.style.color = online ? "#4ade80" : "#f87171";

    bridgeLastError.textContent = aiErr || "None";
    bridgeLastError.style.color = aiErr ? "#f87171" : "#94a3b8";
  } catch (error) {
    setBridgeValue(bridgeOnlineState, "Offline", "bad");
    setBridgeValue(bridgeResponseMs, "-- ms", "bad");
    setBridgeValue(bridgeHealthLatency, "-- ms", "bad");
    bridgePortStatus.textContent = "Closed";
    bridgePortStatus.style.color = "#f87171";
    bridgeLastError.textContent = error.message || "Unknown bridge error";
    bridgeLastError.style.color = "#f87171";
  } finally {
    bridgePollInflight = false;
  }
}

async function runSelfRepair(execute = false) {
  const btn = execute ? selfRepairExecuteBtn : selfRepairScanBtn;
  const original = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = execute ? "Executing..." : "Scanning...";
  }

  try {
    if (execute) {
      const ok = window.confirm(
        "Run Self-Repair Execute mode? This can apply automatic file repairs.",
      );
      if (!ok) return;
    }

    const res = await fetch("/api/self-repair/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ execute }),
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.error || "Self-repair request failed");

    paintSelfRepairStatus(data.report || null);
    appendMsg(
      "assistant",
      `**Self-Repair ${execute ? "Execute" : "Scan"} Complete**\n\nIssues: ${data.report?.summary?.totalIssues ?? "--"}\nRepairs Applied: ${data.report?.summary?.repairsApplied ?? "--"}\nExit Code: ${data.exitCode}`,
      false,
    );
  } catch (error) {
    appendMsg(
      "assistant",
      `**Self-Repair ${execute ? "Execute" : "Scan"} Error:** ${error.message}`,
      false,
    );
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = original;
    }
  }
}

async function refreshSystemData() {
  try {
    const [healthRes, revRes, runtimeRes, selfRepairRes] = await Promise.all([
      fetch("/api/site-health", { cache: "no-store" }),
      fetch("/api/client-revision", { cache: "no-store" }),
      fetch("/api/chat-runtime-status", { cache: "no-store" }),
      fetch("/api/self-repair/status", { cache: "no-store" }),
    ]);
    const health = await healthRes.json();
    const rev = await revRes.json();
    const runtime = runtimeRes.ok ? await runtimeRes.json() : {};
    const selfRepair = selfRepairRes.ok ? await selfRepairRes.json() : null;
    const score = Number(health.score || 0);
    const domainPresent = (health.domainHealth || []).filter(
      (d) => d.present,
    ).length;
    const domainTotal = (health.domainHealth || []).length || 14;
    sysHealthScore.textContent = Number.isFinite(score) ? String(score) : "--";
    sysHealthScore.style.color =
      score >= 80 ? "#4ade80" : score >= 60 ? "#f59e0b" : "#f87171";
    sysDomainCoverage.textContent = `${domainPresent}/${domainTotal}`;
    sysIntelCards.textContent = String(health.worldIntelCards ?? "--");
    sysPhotoCoverage.textContent = `${health.assignedSlots ?? "--"}/${health.totalSlots ?? "--"}`;
    sysMissingPhotos.textContent = String(health.missingPhotos ?? "--");
    sysServerStarted.textContent = rev.startedAt
      ? new Date(rev.startedAt).toLocaleString()
      : "--";
    const gpu = Number.isFinite(runtime?.gpu?.livePercent)
      ? runtime.gpu.livePercent
      : runtime?.gpu?.fallbackPercent;
    sysGpuLive.textContent = Number.isFinite(gpu) ? `${gpu}%` : "--%";
    if (Number.isFinite(gpu)) {
      sysGpuLive.style.color =
        gpu >= 90 ? "#ef4444" : gpu >= 40 ? "#f59e0b" : "#4ade80";
    }
    paintSelfRepairStatus(selfRepair?.report || null);
    applyBackendFixState(health, runtime, rev);
    renderSiteFixes();
  } catch {
    sysHealthScore.textContent = "--";
    sysDomainCoverage.textContent = "--";
    sysIntelCards.textContent = "--";
    sysPhotoCoverage.textContent = "--";
    sysMissingPhotos.textContent = "--";
    sysServerStarted.textContent = "--";
    sysGpuLive.textContent = "--%";
    sysSelfRepairState.textContent = "--";
    sysSelfRepairIssues.textContent = "--";
  }
}

refreshSystemBtn?.addEventListener("click", refreshSystemData);
selfRepairScanBtn?.addEventListener("click", () => runSelfRepair(false));
selfRepairExecuteBtn?.addEventListener("click", () => runSelfRepair(true));
refreshBridgeBtn?.addEventListener("click", refreshBridgeStatus);
refreshFixesBtn?.addEventListener("click", () => {
  refreshSystemData();
});
autoFixAllBtn?.addEventListener("click", () => {
  setProvider("admin");
  activatePane("conversation");
  chatInput.value =
    "APPROVED FOR LIVE. Run a full SITE FIXES LIST sweep for chat top dock, GPU color parity, chart health fallback, power visuals, 3D viewer model loading, and disease index enrichment. Apply safe fixes and return a concise change summary with residual risks.";
  sendPrompt();
});

function renderMd(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`\n]+?)`/g, '<code class="inline">$1</code>')
    .replace(/^[-*] (.+)$/gm, "&bull; $1")
    .replace(/\n\n+/g, "<br><br>")
    .replace(/\n/g, "<br>");
}

function installCopyHandler(button, getText) {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(getText());
      const original = button.textContent;
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = original;
      }, 1400);
    } catch {
      button.textContent = "Copy Failed";
      setTimeout(() => {
        button.textContent = "Copy";
      }, 1400);
    }
  });
}

installCopyHandler(
  document.querySelector(".chat-copy-btn"),
  () => chatBox.firstElementChild.querySelector("div:nth-child(2)").innerText,
);

function appendMsg(role, text, isHtml) {
  const wrap = document.createElement("div");
  wrap.className = "chat-message" + (role === "user" ? " user" : "");

  const label = document.createElement("div");
  label.className = "chat-label";
  label.textContent = role === "user" ? "You" : "Assistant";

  const body = document.createElement("div");
  body.innerHTML = isHtml ? text : renderMd(text);

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "chat-copy-btn";
  copyBtn.textContent = "Copy";
  installCopyHandler(copyBtn, () => body.innerText);

  wrap.appendChild(label);
  wrap.appendChild(body);
  wrap.appendChild(copyBtn);
  chatBox.appendChild(wrap);
  chatBox.scrollTop = chatBox.scrollHeight;
  return body;
}

providerButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    providerButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedProvider = btn.dataset.provider;
    writeSharedProvider(selectedProvider);
    chatModeHint.innerHTML = PROVIDER_HINTS[selectedProvider] || "";
    chatInput.placeholder =
      selectedProvider === "edit"
        ? "Describe a concrete site change to apply..."
        : selectedProvider === "aria"
          ? "Ask ARIA to perform a local task..."
          : selectedProvider === "algalon"
            ? "Ask Algalon for strategic analysis, threat detection, and system-wide reasoning..."
            : "Ask anything about the platform, code, or roadmap...";
    if (selectedProvider === "aria") connectAria();
  });
});

window.addEventListener("storage", (event) => {
  if (
    event.key === SHARED_CHAT_PROVIDER_KEY &&
    event.newValue &&
    event.newValue !== JSON.stringify(selectedProvider)
  ) {
    try {
      const provider = JSON.parse(event.newValue);
      if (
        ["guide", "admin", "algalon", "aria", "code", "edit", "local"].includes(
          provider,
        )
      ) {
        setProvider(provider === "local" ? "guide" : provider);
      }
    } catch {}
  }
});

window.addEventListener("site-chat-provider-change", (event) => {
  const provider = event?.detail?.provider;
  if (
    provider &&
    provider !== selectedProvider &&
    ["guide", "admin", "algalon", "aria", "code", "edit", "local"].includes(
      provider,
    )
  ) {
    setProvider(provider === "local" ? "guide" : provider);
  }
});

window.addEventListener("site-chat-mode-change", (event) => {
  const mode = event?.detail?.mode || readSharedMode();
  if (mode === "chat" && selectedProvider === "local") {
    setProvider("algalon");
  }
});

function connectAria() {
  if (ariaWs && ariaWs.readyState === 1) {
    ariaReady = true;
    return;
  }
  ariaReady = false;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ariaWs = new WebSocket(`${proto}://localhost:7000/ws/${ariaSid}`);
  ariaWs.onopen = () => {
    ariaReady = true;
    chatModeHint.innerHTML =
      PROVIDER_HINTS.aria + " Connected to localhost:7000.";
  };
  ariaWs.onmessage = (event) => handleAriaMessage(JSON.parse(event.data));
  ariaWs.onclose = () => {
    ariaReady = false;
    chatModeHint.innerHTML =
      "ARIA Agent is disconnected. Retrying local websocket...";
    setTimeout(() => {
      if (selectedProvider === "aria") connectAria();
    }, 2500);
  };
}

function handleAriaMessage(msg) {
  switch (msg.type) {
    case "thinking_start":
      if (!ariaCurrentBody) {
        ariaCurrentBody = appendMsg(
          "assistant",
          '<em style="color:#94a3b8;">ARIA is thinking...</em>',
          true,
        );
        ariaToolContainer = null;
      }
      break;
    case "thinking":
      if (ariaCurrentBody && msg.text) {
        ariaCurrentBody.innerHTML =
          '<em style="color:#94a3b8;">' + msg.text.slice(0, 120) + "</em>";
      }
      break;
    case "tool_call":
      if (!ariaCurrentBody) ariaCurrentBody = appendMsg("assistant", "", true);
      if (!ariaToolContainer) {
        ariaToolContainer = document.createElement("div");
        ariaToolContainer.style.cssText =
          "display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;";
        ariaCurrentBody.appendChild(ariaToolContainer);
      }
      const chip = document.createElement("span");
      chip.id = "tool-" + msg.id;
      chip.style.cssText =
        "padding:4px 8px;border-radius:999px;background:rgba(129,140,248,0.12);border:1px solid rgba(129,140,248,0.24);font-size:11px;color:#c4b5fd;";
      chip.textContent = "Running " + msg.name;
      ariaToolContainer.appendChild(chip);
      break;
    case "tool_result":
      const toolChip = document.getElementById("tool-" + msg.id);
      if (toolChip) toolChip.textContent = toolChip.textContent + " complete";
      break;
    case "response":
      if (ariaCurrentBody) {
        const tools = ariaToolContainer;
        ariaCurrentBody.innerHTML = renderMd(
          msg.text || "ARIA completed the task.",
        );
        if (tools)
          ariaCurrentBody.insertBefore(tools, ariaCurrentBody.firstChild);
      } else {
        appendMsg("assistant", msg.text || "ARIA completed the task.", false);
      }
      saveHistoryEntry({
        ts: Date.now(),
        provider: "aria",
        label: "ARIA Agent",
        prompt: pendingAriaPrompt,
        result: msg.text || "ARIA completed the task.",
      });
      ariaCurrentBody = null;
      ariaToolContainer = null;
      chatSend.disabled = false;
      break;
    case "error":
      appendMsg(
        "assistant",
        "**ARIA error:** " + (msg.text || "Unknown ARIA failure."),
        false,
      );
      saveHistoryEntry({
        ts: Date.now(),
        provider: "aria",
        label: "ARIA Agent",
        prompt: pendingAriaPrompt,
        result: "Error: " + (msg.text || "Unknown ARIA failure."),
      });
      ariaCurrentBody = null;
      ariaToolContainer = null;
      chatSend.disabled = false;
      break;
  }
  chatBox.scrollTop = chatBox.scrollHeight;
}

function buildRequestConfig(prompt) {
  if (selectedProvider === "guide") {
    return {
      endpoint: "/api/guide",
      payload: { prompt },
      label: "AI Team",
    };
  }
  if (selectedProvider === "admin") {
    return {
      endpoint: "/api/admin-guide",
      payload: { message: prompt, history: [] },
      label: "Super AI",
    };
  }
  if (selectedProvider === "algalon") {
    const coreContext =
      "Core reference baseline: /CORE-SYSTEM.md, /admin-reference.html, /reference.html. Keep responses aligned with this canonical core.";
    return {
      endpoint: "/api/chat",
      payload: {
        provider: "algalon",
        prompt: `[ALGALON CORE]\n${coreContext}\n\nUser request: ${prompt}`,
      },
      label: "Algalon Core",
    };
  }
  if (selectedProvider === "code") {
    return {
      endpoint: "/api/chat",
      payload: { provider: "code", prompt },
      label: "Code AI",
    };
  }
  return null;
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {}
    return { res, data };
  } finally {
    clearTimeout(timer);
  }
}

async function sendPrompt() {
  const prompt = chatInput.value.trim();
  if (!prompt || chatSend.disabled) return;

  appendMsg("user", prompt, false);
  chatInput.value = "";
  chatSend.disabled = true;

  if (selectedProvider === "aria") {
    pendingAriaPrompt = prompt;
    ariaCurrentBody = null;
    ariaToolContainer = null;
    if (!ariaWs || ariaWs.readyState !== 1) {
      connectAria();
      setTimeout(() => {
        if (ariaWs && ariaWs.readyState === 1) {
          ariaWs.send(JSON.stringify({ type: "message", text: prompt }));
        } else {
          appendMsg(
            "assistant",
            "ARIA is not connected. Make sure localhost:7000 is running.",
            false,
          );
          saveHistoryEntry({
            ts: Date.now(),
            provider: "aria",
            label: "ARIA Agent",
            prompt,
            result: "Error: ARIA is not connected.",
          });
          chatSend.disabled = false;
        }
      }, 900);
      return;
    }
    ariaWs.send(JSON.stringify({ type: "message", text: prompt }));
    return;
  }

  if (selectedProvider === "edit") {
    const body = appendMsg(
      "assistant",
      '<em style="color:#94a3b8;">Applying live edit...</em>',
      true,
    );
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: prompt }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Edit request failed");
      }
      const count =
        (data.changes || []).filter((item) => item.success).length || 1;
      body.innerHTML = renderMd(
        `**Site updated**\n\n${count} change${count === 1 ? "" : "s"} applied. This page will refresh automatically if the tracked files changed.`,
      );
      saveHistoryEntry({
        ts: Date.now(),
        provider: "edit",
        label: "Edit Site",
        prompt,
        result: `${count} change${count === 1 ? "" : "s"} applied.`,
      });
    } catch (error) {
      body.innerHTML = renderMd("**Edit error:** " + error.message);
      saveHistoryEntry({
        ts: Date.now(),
        provider: "edit",
        label: "Edit Site",
        prompt,
        result: "Error: " + error.message,
      });
    }
    chatSend.disabled = false;
    chatBox.scrollTop = chatBox.scrollHeight;
    return;
  }

  const config = buildRequestConfig(prompt);
  const body = appendMsg(
    "assistant",
    '<em style="color:#94a3b8;">Thinking...</em>',
    true,
  );
  body.parentElement.querySelector(".chat-label").textContent = config
    ? config.label
    : "Assistant";

  try {
    const { res, data } = await fetchJsonWithTimeout(
      config.endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config.payload),
      },
      60000,
    );
    if (!res.ok) throw new Error(data.error || "Request failed");
    body.innerHTML = renderMd(data.text || "No response text returned.");
    if (Array.isArray(data.actions) && data.actions.length) {
      const note = document.createElement("div");
      note.style.cssText = "margin-top:10px;font-size:11px;color:#a5b4fc;";
      note.textContent =
        data.actions.length +
        " action" +
        (data.actions.length === 1 ? "" : "s") +
        " extracted";
      body.appendChild(note);
    }
    saveHistoryEntry({
      ts: Date.now(),
      provider: selectedProvider,
      label: config?.label || "Assistant",
      prompt,
      result: data.text || "No response text returned.",
    });
  } catch (error) {
    const timedOut =
      error?.name === "AbortError" ||
      /aborted|timeout/i.test(String(error?.message || ""));
    body.innerHTML = renderMd(
      timedOut
        ? "**Error:** Request timed out while model was busy. Try again."
        : "**Error:** " + error.message,
    );
    saveHistoryEntry({
      ts: Date.now(),
      provider: selectedProvider,
      label: config?.label || "Assistant",
      prompt,
      result: timedOut
        ? "Error: Request timed out while model was busy."
        : "Error: " + error.message,
    });
  }

  chatSend.disabled = false;
  chatBox.scrollTop = chatBox.scrollHeight;
}

chatSend.addEventListener("click", sendPrompt);
chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendPrompt();
  }
});

function shouldDelayReload() {
  const active = document.activeElement;
  if (!active) return false;
  if (
    (active.tagName === "TEXTAREA" || active.tagName === "INPUT") &&
    active.value &&
    active.value.trim()
  ) {
    return true;
  }
  return false;
}

let revisionWatcherPoller = null;

async function startRevisionWatcher() {
  try {
    const first = await fetch("/api/client-revision", {
      cache: "no-store",
    });
    if (!first.ok) {
      throw new Error(`revision endpoint unavailable: ${first.status}`);
    }
    const data = await first.json();
    lastRevision = data.revision || 0;
    revisionStatus.textContent = "Live Sync Ready";
    sysRevisionState.textContent = "Watching";
  } catch {
    revisionStatus.textContent = "Revision Watch Offline";
    sysRevisionState.textContent = "Offline";
    return;
  }

  if (revisionWatcherPoller) clearInterval(revisionWatcherPoller);
  revisionWatcherPoller = setInterval(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const res = await fetch("/api/client-revision", {
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 404) {
          revisionStatus.textContent = "Revision Watch Offline";
          sysRevisionState.textContent = "Offline";
          clearInterval(revisionWatcherPoller);
          revisionWatcherPoller = null;
        }
        return;
      }
      const data = await res.json();
      const nextRevision = data.revision || 0;
      if (!lastRevision) {
        lastRevision = nextRevision;
        return;
      }
      if (nextRevision > lastRevision) {
        if (shouldDelayReload()) {
          revisionStatus.textContent = "Update Waiting";
          sysRevisionState.textContent = "Update Waiting";
          return;
        }
        revisionStatus.textContent = "Reloading";
        sysRevisionState.textContent = "Reloading";
        reloadToast.classList.add("show");
        setTimeout(() => location.reload(), 700);
      }
      lastRevision = nextRevision;
      if (!shouldDelayReload()) {
        revisionStatus.textContent = "Live Sync Ready";
        sysRevisionState.textContent = "Watching";
      }
    } catch {
      revisionStatus.textContent = "Revision Watch Offline";
      sysRevisionState.textContent = "Offline";
    }
  }, 12000);
}

const urlProvider = new URLSearchParams(location.search).get("provider");
const requestedProvider = urlProvider === "guide" ? "algalon" : urlProvider;
if (requestedProvider) {
  const target = document.querySelector(
    `.provider-btn[data-provider="${requestedProvider}"]`,
  );
  if (target) target.click();
} else {
  try {
    const sharedProvider = JSON.parse(
      localStorage.getItem(SHARED_CHAT_PROVIDER_KEY) || '"algalon"',
    );
    if (
      ["guide", "admin", "algalon", "aria", "code", "edit"].includes(
        sharedProvider,
      )
    ) {
      setProvider(sharedProvider);
    }
  } catch {}
}

if (new URLSearchParams(location.search).get("follow") === "1") {
  localStorage.setItem("algalonFollowMode", "1");
  followModeEnabled = true;
}

if (localStorage.getItem("adminChatSplitMode") === "1") {
  setSplitMode(true);
} else {
  setSplitMode(false);
}

renderTemplateSelect();
renderHistory();
renderSiteFixes();
initAlgalonLiveGraph();
updateFollowUi();
refreshSystemData();
refreshBridgeStatus();
setInterval(() => {
  if (document.visibilityState !== "visible") return;
  refreshSystemData();
}, 20000);
setInterval(() => {
  if (document.visibilityState !== "visible") return;
  refreshBridgeStatus();
}, 2000);
startRevisionWatcher();

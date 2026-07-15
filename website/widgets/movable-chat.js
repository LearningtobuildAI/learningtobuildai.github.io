(function () {
  if (window.__SITE_MOVABLE_CHAT_INIT__) return;
  window.__SITE_MOVABLE_CHAT_INIT__ = true;

  const path = String(location.pathname || "");
  const isAdminPage = path.startsWith("/admin-chat");
  const threadId = "site-movable-chat";
  const sharedProviderKey = "site_chat_provider_v1";
  const sharedModeKey = "site_chat_mode_v1";
  const providerMigrationKey = "site_chat_provider_algron_migrated_v1";
  const drawerKey = "site_chat_details_open_v1";
  const links = [
    ["Home", "/index.html"],
    ["Website", "/website/index.html"],
    ["AI", "/website/ai/index.html"],
    ["Medicine", "/website/medicine/index.html"],
    ["Energy", "/website/energy/index.html"],
    ["Matrix", "/website/sections/matrix/index.html"],
    ["Admin", "/admin-chat.html?provider=guide"],
  ];
  const providerLabels = {
    local: "Local",
    guide: "AI Team",
    admin: "Super AI",
    algalon: "Algron",
    aria: "ARIA",
    code: "Code",
    edit: "Edit Site",
  };
  const modeMeta = {
    chat: {
      placeholder: "Ask local AI anything...",
      hint: "Local bridge chat mode",
    },
    guide: {
      placeholder: "Ask guide for mapped intelligence...",
      hint: "Guide mode with persistent thread context",
    },
    tts: {
      placeholder: "Generate a response and speak it...",
      hint: "Guide response plus TTS playback",
    },
  };

  const store = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value == null ? fallback : JSON.parse(value);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    },
  };

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function stampText(value) {
    try {
      return new Date(value || Date.now()).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "--:--";
    }
  }

  function metricGbFromMb(valueMb) {
    const value = Number(valueMb);
    if (!Number.isFinite(value)) return "--";
    return (Math.round((value / 1024) * 10) / 10).toFixed(1);
  }

  function emitSync(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function supportedProvider(provider) {
    return [
      "local",
      "guide",
      "admin",
      "algalon",
      "aria",
      "code",
      "edit",
    ].includes(provider);
  }

  const root = el("section");
  root.id = "siteMovableChat";

  const head = el("div", "mc-head");
  const titleWrap = el("div", "mc-title-wrap");
  const title = el(
    "div",
    "mc-title",
    isAdminPage ? "Admin Chat" : "AI Chat",
  );
  const subtitle = el(
    "div",
    "mc-subtitle",
    isAdminPage
      ? "Persistent admin + site chat"
      : "Persistent site intelligence chat",
  );
  titleWrap.append(title, subtitle);
  const actions = el("div", "mc-actions");
  const detailsBtn = el("button", "mc-btn mc-secondary-btn", "Details");
  const minBtn = el("button", "mc-btn", "Min");
  const resetBtn = el("button", "mc-btn", "Reset");
  const closeBtn = el("button", "mc-btn mc-close-btn", "\u00d7");
  detailsBtn.type = "button";
  minBtn.type = "button";
  resetBtn.type = "button";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close chat");
  actions.append(detailsBtn, minBtn, resetBtn, closeBtn);
  head.append(titleWrap, actions);

  const body = el("div", "mc-body");
  const runtime = el("div", "mc-runtime");
  const levelPill = el("div", "mc-pill mc-pill-level", "LVL 1");
  const gpuPill = el("div", "mc-pill mc-pill-gpu", "GPU --%");
  const vramPill = el("div", "mc-pill mc-pill-vram", "VRAM --/--G");
  const cpuPill = el("div", "mc-pill mc-pill-cpu", "CPU --%");
  runtime.append(levelPill, gpuPill, vramPill, cpuPill);

  const metricsRow = el("div", "mc-metrics-row");
  const ramPill = el("div", "mc-pill mc-pill-ram", "RAM --/--G");
  const procPill = el("div", "mc-pill mc-pill-proc", "RSS --MB");
  const xpWrap = el("div", "mc-xp");
  const xpLabel = el("div", "mc-xp-label", "XP 0/100");
  const xpTrack = el("div", "mc-xp-track");
  const xpFill = el("div", "mc-xp-fill");
  xpTrack.appendChild(xpFill);
  xpWrap.append(xpLabel, xpTrack);
  metricsRow.append(ramPill, procPill, xpWrap);

  const diagPanel = el("div", "mc-diag-panel");
  const diagChat = el("div", "mc-diag-chip", "CHAT");
  const diagGuide = el("div", "mc-diag-chip", "GUIDE");
  const diagTts = el("div", "mc-diag-chip", "TTS");
  const diagBridge = el("div", "mc-diag-chip", "BRIDGE");
  diagPanel.append(diagChat, diagGuide, diagTts, diagBridge);

  const diagMeta = el("div", "mc-status-row mc-diag-meta");
  const modelPill = el("div", "mc-status-pill", "Model --");
  const latencyPill = el("div", "mc-status-pill", "Last --ms");
  diagMeta.append(modelPill, latencyPill);

  const statusRow = el("div", "mc-status-row");
  const bridgePill = el("div", "mc-status-pill", "Bridge --");
  const aiPill = el("div", "mc-status-pill", "AI --");
  const modePill = el("div", "mc-status-pill", "Mode guide");
  const providerPill = el("div", "mc-status-pill", "Provider AI Team");
  statusRow.append(bridgePill, aiPill, modePill, providerPill);

  const controlRow = el("div", "mc-control-row");
  const providerLabel = el("label", "mc-mode-label", "Provider");
  providerLabel.htmlFor = "mcProviderSelect";
  const providerSelect = el("select", "mc-provider-select");
  providerSelect.id = "mcProviderSelect";
  ["local", "guide", "admin", "algalon", "aria", "code", "edit"].forEach(
    (provider) => {
      const option = document.createElement("option");
      option.value = provider;
      option.textContent = providerLabels[provider];
      providerSelect.appendChild(option);
    },
  );
  const modeLabel = el("label", "mc-mode-label", "Mode");
  modeLabel.htmlFor = "mcModeSelect";
  const modeSelect = el("select", "mc-mode-select");
  modeSelect.id = "mcModeSelect";
  ["chat", "guide", "tts"].forEach((mode) => {
    const option = document.createElement("option");
    option.value = mode;
    option.textContent = mode.toUpperCase();
    modeSelect.appendChild(option);
  });
  const speakBtn = el("button", "mc-btn mc-secondary-btn", "Speak");
  speakBtn.type = "button";
  controlRow.append(
    providerLabel,
    providerSelect,
    modeLabel,
    modeSelect,
    speakBtn,
  );
  const hint = el("div", "mc-hint", modeMeta.guide.hint);

  const detailDrawer = el("div", "mc-detail-drawer");
  const detailGrid = el("div", "mc-detail-grid");
  const detailModel = el("div", "mc-detail-item", "Active model: --");
  const detailLatency = el("div", "mc-detail-item", "Last inference: -- ms");
  const detailVramSource = el("div", "mc-detail-item", "VRAM source: --");
  const detailBridgeTarget = el("div", "mc-detail-item", "Bridge target: --");
  const detailRefresh = el("div", "mc-detail-item", "Runtime refresh: --");
  const detailServer = el("div", "mc-detail-item", "Server start: --");
  detailGrid.append(
    detailModel,
    detailLatency,
    detailVramSource,
    detailBridgeTarget,
    detailRefresh,
    detailServer,
  );
  detailDrawer.appendChild(detailGrid);

  const nav = el("div", "mc-nav");
  for (const [label, href] of links) {
    const anchor = el("a", "", label);
    anchor.href = href;
    nav.appendChild(anchor);
  }

  const log = el("div", "mc-log");
  const compose = el("div", "mc-compose");
  const input = el("textarea", "mc-input");
  const send = el("button", "mc-send", "Send");
  send.type = "button";
  compose.append(input, send);

  body.append(
    runtime,
    metricsRow,
    diagPanel,
    diagMeta,
    statusRow,
    controlRow,
    hint,
    detailDrawer,
    nav,
    log,
    compose,
  );
  root.append(head, body);
  document.body.appendChild(root);

  // Single-chat launcher. The panel is collapsed by default so it no longer
  // overlays every page; a bottom-right button toggles the one chat open/closed.
  const fab = el("button", "mc-fab mc-fab-hidden");
  fab.type = "button";
  fab.setAttribute("aria-label", "Open chat");
  fab.title = "Chat";
  fab.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"/></svg>';
  document.body.appendChild(fab);
  const collapsedKey = "site_chat_collapsed_v1";
  function setChatCollapsed(collapsed) {
    root.classList.toggle("mc-collapsed", collapsed);
    fab.classList.toggle("mc-fab-hidden", !collapsed);
    store.set(collapsedKey, collapsed);
  }
  fab.addEventListener("click", () => setChatCollapsed(false));

  const xpState = store.get("site_chat_xp_v1", {
    level: 17,
    xp: 0,
    perLevel: 100,
    total: 0,
  });
  if (!Number.isFinite(Number(xpState.level)) || Number(xpState.level) < 17) {
    xpState.level = 17;
    xpState.xp = Math.max(0, Number(xpState.xp || 0));
    xpState.perLevel = Math.max(1, Number(xpState.perLevel || 100));
    xpState.total = Math.max(
      Number(xpState.total || 0),
      1600 + Number(xpState.xp || 0),
    );
    store.set("site_chat_xp_v1", xpState);
  }
  const drawerOpen = store.get(drawerKey, false);
  let currentMode = store.get(sharedModeKey, "guide");
  let currentProvider = store.get(sharedProviderKey, "algalon");
  if (!store.get(providerMigrationKey, false)) {
    currentProvider = "algalon";
    store.set(sharedProviderKey, currentProvider);
    store.set(providerMigrationKey, true);
  }
  let lastAiResponse = store.get("site_chat_last_response_v1", "");
  let runtimeSnapshot = null;
  let bridgeTarget = "--";
  let lastInferenceMs = null;
  let lastModel = "--";
  let ariaWs = null;
  let ariaReady = false;
  let ariaPending = null;
  const ariaSid = "site-chat-aria-" + Math.random().toString(36).slice(2, 8);

  function updateDrawer(open) {
    root.classList.toggle("details-open", open);
    detailsBtn.textContent = open ? "Hide" : "Details";
    store.set(drawerKey, open);
  }

  function saveScroll() {
    store.set("site_chat_scroll_v1", log.scrollTop);
  }

  function restoreScroll() {
    const scrollTop = store.get("site_chat_scroll_v1", null);
    if (typeof scrollTop === "number") log.scrollTop = scrollTop;
  }

  function setDiagState() {
    diagChat.dataset.active = currentMode === "chat" ? "true" : "false";
    diagGuide.dataset.active = currentMode === "guide" ? "true" : "false";
    diagTts.dataset.active = currentMode === "tts" ? "true" : "false";
  }

  function syncProviderUi() {
    providerSelect.value = currentProvider;
    providerPill.textContent =
      "Provider " + (providerLabels[currentProvider] || currentProvider);
  }

  function providerModel(provider) {
    if (!runtimeSnapshot?.models) return "--";
    if (provider === "local") return runtimeSnapshot.models.localChat || "--";
    return (
      runtimeSnapshot.models[provider] || runtimeSnapshot.models.guide || "--"
    );
  }

  function updateDetailFields() {
    detailModel.textContent = "Active model: " + lastModel;
    detailLatency.textContent =
      "Last inference: " +
      (Number.isFinite(lastInferenceMs) ? `${lastInferenceMs} ms` : "-- ms");
    detailVramSource.textContent =
      "VRAM source: " + (runtimeSnapshot?.gpu?.source || "--");
    detailBridgeTarget.textContent = "Bridge target: " + bridgeTarget;
    detailRefresh.textContent =
      "Runtime refresh: " +
      (runtimeSnapshot?.refreshedAt
        ? stampText(runtimeSnapshot.refreshedAt)
        : "--");
    detailServer.textContent =
      "Server start: " +
      (runtimeSnapshot?.serverStartedAt
        ? stampText(runtimeSnapshot.serverStartedAt)
        : "--");
  }

  function updateInferenceUi() {
    modelPill.textContent = "Model " + lastModel;
    latencyPill.textContent =
      "Last " +
      (Number.isFinite(lastInferenceMs) ? `${lastInferenceMs}ms` : "--ms");
    updateDetailFields();
  }

  function setProvider(provider, emit) {
    currentProvider = supportedProvider(provider) ? provider : "guide";
    store.set(sharedProviderKey, currentProvider);
    syncProviderUi();
    lastModel = providerModel(currentProvider);
    updateInferenceUi();
    if (emit !== false)
      emitSync("site-chat-provider-change", { provider: currentProvider });
  }

  function setMode(mode, emit) {
    currentMode = modeMeta[mode] ? mode : "guide";
    if (currentMode === "chat") {
      currentProvider = "local";
    } else if (currentProvider === "local") {
      currentProvider = "guide";
    }
    modeSelect.value = currentMode;
    input.placeholder = modeMeta[currentMode].placeholder;
    hint.textContent = modeMeta[currentMode].hint;
    modePill.textContent = "Mode " + currentMode;
    store.set(sharedModeKey, currentMode);
    setDiagState();
    setProvider(currentProvider, false);
    if (emit !== false) {
      emitSync("site-chat-mode-change", { mode: currentMode });
      emitSync("site-chat-provider-change", { provider: currentProvider });
    }
  }

  function paintXp() {
    const level = Number(xpState.level || 1);
    const xp = Number(xpState.xp || 0);
    const perLevel = Number(xpState.perLevel || 100);
    const pct = Math.max(0, Math.min(100, Math.round((xp / perLevel) * 100)));
    levelPill.textContent = "LVL " + level;
    xpLabel.textContent = "XP " + xp + "/" + perLevel;
    xpFill.style.width = pct + "%";
  }

  function addXp(amount) {
    const value = Math.max(0, Number(amount || 0));
    if (!value) return;
    xpState.total = Number(xpState.total || 0) + value;
    xpState.xp = Number(xpState.xp || 0) + value;
    xpState.perLevel = Number(xpState.perLevel || 100);
    while (xpState.xp >= xpState.perLevel) {
      xpState.xp -= xpState.perLevel;
      xpState.level = Number(xpState.level || 1) + 1;
    }
    store.set("site_chat_xp_v1", xpState);
    paintXp();
  }

  function paintStatus(node, text, tone) {
    node.textContent = text;
    node.dataset.tone = tone || "neutral";
  }

  function paintMetrics(data) {
    const gpu = data?.gpu || {};
    const system = data?.system || {};
    const gpuPct = Number(gpu.livePercent);
    const vramUsed = metricGbFromMb(gpu.vramUsedMB);
    const vramTotal = metricGbFromMb(gpu.vramTotalMB);
    const cpuPct = Number(system.cpuPercent);
    const ramUsed = Number(system.ramUsedGB);
    const ramTotal = Number(system.ramTotalGB);
    const rss = Number(system.processRssMB);
    gpuPill.textContent = Number.isFinite(gpuPct)
      ? `GPU ${gpuPct}%`
      : "GPU --%";
    vramPill.textContent = `VRAM ${vramUsed}/${vramTotal}G`;
    cpuPill.textContent = Number.isFinite(cpuPct)
      ? `CPU ${cpuPct}%`
      : "CPU --%";
    ramPill.textContent =
      Number.isFinite(ramUsed) && Number.isFinite(ramTotal)
        ? `RAM ${ramUsed.toFixed(1)}/${ramTotal.toFixed(1)}G`
        : "RAM --/--G";
    procPill.textContent = Number.isFinite(rss) ? `RSS ${rss}MB` : "RSS --MB";
  }

  async function refreshRuntime() {
    try {
      const res = await fetch("/api/chat-runtime-status", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("runtime status unavailable");
      runtimeSnapshot = await res.json();
      paintMetrics(runtimeSnapshot);
      const localOnline = runtimeSnapshot?.liveLocal?.online === true;
      paintStatus(
        aiPill,
        localOnline ? "AI local live" : "AI fallback",
        localOnline ? "ok" : "warn",
      );
      lastModel = providerModel(currentProvider);
      updateInferenceUi();
    } catch {
      paintStatus(aiPill, "AI offline", "bad");
    }
  }

  async function refreshBridge() {
    try {
      const res = await fetch("/api/bridge/health", {
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      const online = res.ok && data.ok === true;
      bridgeTarget = String(data.target || bridgeTarget || "--");
      // "Desktop link idle" — the bridge only exists while the Algalon desktop
      // app is open; a red OFFLINE chip made normal operation look broken.
      paintStatus(
        bridgePill,
        online ? "Bridge online" : "Desktop link idle",
        online ? "ok" : "neutral",
      );
      diagBridge.dataset.active = online ? "true" : "false";
      updateDetailFields();
    } catch {
      paintStatus(bridgePill, "Desktop link idle", "neutral");
      diagBridge.dataset.active = "false";
    }
  }

  function messageNode(message) {
    const role = message.role === "user" ? "user" : "bot";
    const item = el("div", "mc-msg " + role);
    const meta = el("div", "mc-msg-meta");
    const who = el(
      "span",
      "mc-msg-role",
      role === "user"
        ? "You"
        : message.provider === "aria"
          ? "ARIA"
          : message.mode === "tts"
            ? "AI TTS"
            : providerLabels[message.provider] || "AI",
    );
    const stamp = el("span", "mc-msg-time", stampText(message.t));
    meta.append(who, stamp);
    const bodyNode = el("div", "mc-msg-body", message.text || "");
    item.append(meta, bodyNode);
    return item;
  }

  function appendMessage(message) {
    const node = messageNode(message);
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
    saveScroll();
    return node;
  }

  function restoreHistory() {
    const hist = store.get("site_chat_history_v1", []);
    for (const message of hist.slice(-24)) appendMessage(message);
    if (!hist.length) {
      appendMessage({
        role: "bot",
        text: "Navigator active. Chat, guide, TTS, bridge status, metrics, and providers persist across the site.",
        mode: currentMode,
        provider: currentProvider,
        t: Date.now(),
      });
    }
    restoreScroll();
  }

  function saveMessage(role, text, mode, provider) {
    const hist = store.get("site_chat_history_v1", []);
    hist.push({
      role,
      text,
      mode: mode || currentMode,
      provider: provider || currentProvider,
      t: Date.now(),
    });
    store.set("site_chat_history_v1", hist.slice(-60));
  }

  function applyPos() {
    const pos = store.get("site_chat_pos_v1", null);
    if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") return;
    clampAndSave(pos.x, pos.y);
  }

  function clampAndSave(x, y) {
    const width = root.offsetWidth;
    const height = root.offsetHeight;
    const maxX = Math.max(4, window.innerWidth - width - 4);
    const maxY = Math.max(4, window.innerHeight - height - 4);
    const nextX = Math.min(maxX, Math.max(4, x));
    const nextY = Math.min(maxY, Math.max(4, y));
    root.style.left = nextX + "px";
    root.style.top = nextY + "px";
    root.style.right = "auto";
    root.style.bottom = "auto";
    store.set("site_chat_pos_v1", { x: nextX, y: nextY });
  }

  let drag = null;
  head.addEventListener("pointerdown", (event) => {
    if (
      event.target === minBtn ||
      event.target === resetBtn ||
      event.target === detailsBtn
    )
      return;
    drag = {
      dx: event.clientX - root.getBoundingClientRect().left,
      dy: event.clientY - root.getBoundingClientRect().top,
    };
    head.setPointerCapture(event.pointerId);
  });
  head.addEventListener("pointermove", (event) => {
    if (!drag) return;
    clampAndSave(event.clientX - drag.dx, event.clientY - drag.dy);
  });
  head.addEventListener("pointerup", () => {
    drag = null;
  });

  function openFromShell() {
    root.classList.remove("minimized");
    minBtn.textContent = "Min";
    store.set("site_chat_min_v1", false);
    input.focus();
  }

  async function speakText(text) {
    const spoken = String(text || lastAiResponse || "").trim();
    if (!spoken) return;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: spoken, profile: "default" }),
      });
      const data = await res.json();
      if (res.ok && data.audio && data.mimeType) {
        const audio = new Audio(`data:${data.mimeType};base64,${data.audio}`);
        await audio.play();
        return;
      }
    } catch {}
    if ("speechSynthesis" in window) {
      const utter = new SpeechSynthesisUtterance(spoken);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    }
  }

  function markPendingMessage(node, text) {
    const bodyNode = node?.querySelector(".mc-msg-body");
    if (bodyNode) bodyNode.textContent = text;
  }

  function ensureAriaConnection() {
    if (ariaWs && ariaWs.readyState === 1) {
      ariaReady = true;
      return Promise.resolve();
    }
    if (ariaPending?.connectPromise) return ariaPending.connectPromise;

    ariaReady = false;
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const connectPromise = new Promise((resolve, reject) => {
      ariaWs = new WebSocket(`${proto}://localhost:7000/ws/${ariaSid}`);
      let settled = false;
      const finishReject = (message) => {
        if (settled) return;
        settled = true;
        reject(new Error(message));
      };
      const finishResolve = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const timer = setTimeout(
        () => finishReject("ARIA connection timed out."),
        4000,
      );

      ariaWs.onopen = () => {
        clearTimeout(timer);
        ariaReady = true;
        finishResolve();
      };
      ariaWs.onerror = () => {
        clearTimeout(timer);
        finishReject("ARIA websocket failed to connect.");
      };
      ariaWs.onclose = () => {
        ariaReady = false;
        clearTimeout(timer);
        finishReject("ARIA websocket closed before connecting.");
      };
      ariaWs.onmessage = (event) => {
        const msg = JSON.parse(event.data || "{}");
        if (!ariaPending?.request) return;
        if (msg.type === "thinking_start") {
          markPendingMessage(ariaPending.request.node, "ARIA is thinking...");
          return;
        }
        if (msg.type === "thinking" && msg.text) {
          markPendingMessage(
            ariaPending.request.node,
            "ARIA: " + msg.text.slice(0, 120),
          );
          return;
        }
        if (msg.type === "tool_call") {
          const tools = ariaPending.request.tools || [];
          tools.push(msg.name || "tool");
          ariaPending.request.tools = tools;
          markPendingMessage(
            ariaPending.request.node,
            "ARIA tools: " + tools.slice(-3).join(", "),
          );
          return;
        }
        if (msg.type === "response") {
          ariaPending.request.resolve({
            text: msg.text || "ARIA completed the task.",
            model: "ARIA Agent",
          });
          ariaPending.request = null;
          return;
        }
        if (msg.type === "error") {
          ariaPending.request.reject(
            new Error(msg.text || "Unknown ARIA failure."),
          );
          ariaPending.request = null;
        }
      };
    });

    ariaPending = { ...(ariaPending || {}), connectPromise };
    return connectPromise.finally(() => {
      if (ariaPending) delete ariaPending.connectPromise;
    });
  }

  async function requestReply(text, pendingNode) {
    const startedAt = Date.now();

    if (currentProvider === "aria") {
      await ensureAriaConnection();
      const result = await new Promise((resolve, reject) => {
        ariaPending = {
          ...(ariaPending || {}),
          request: { resolve, reject, node: pendingNode, tools: [] },
        };
        ariaWs.send(JSON.stringify({ type: "message", text }));
      });
      result.latencyMs = Date.now() - startedAt;
      return result;
    }

    if (currentProvider === "local") {
      const res = await fetch("/api/bridge/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();
      const reply = String(
        data.response || data.text || data.error || "No response.",
      );
      if (!res.ok) throw new Error(reply);
      return {
        text: reply,
        model: runtimeSnapshot?.models?.localChat || "Local",
        latencyMs: Date.now() - startedAt,
      };
    }

    if (currentProvider === "guide") {
      const res = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();
      const reply = String(
        data.text || data.response || data.error || "No response.",
      );
      if (!res.ok) throw new Error(reply);
      return {
        text: reply,
        model: runtimeSnapshot?.models?.guide || "Guide",
        latencyMs: Date.now() - startedAt,
      };
    }

    if (currentProvider === "admin") {
      const res = await fetch("/api/admin-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: [] }),
      });
      const data = await res.json();
      const reply = String(
        data.text || data.response || data.error || "No response.",
      );
      if (!res.ok) throw new Error(reply);
      return {
        text: reply,
        model: runtimeSnapshot?.models?.admin || "Super AI",
        latencyMs: Date.now() - startedAt,
      };
    }

    if (currentProvider === "algalon" || currentProvider === "code") {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: currentProvider,
          prompt: text,
          threadId,
        }),
      });
      const data = await res.json();
      const reply = String(
        data.text || data.response || data.error || "No response.",
      );
      if (!res.ok) throw new Error(reply);
      return {
        text: reply,
        model: data?.usage?.model || providerModel(currentProvider),
        latencyMs: Date.now() - startedAt,
      };
    }

    if (currentProvider === "edit") {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: text }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Edit request failed");
      }
      return {
        text: `${(data.changes || []).length || 1} change(s) applied.`,
        model: runtimeSnapshot?.models?.edit || "Edit Site",
        latencyMs: Date.now() - startedAt,
      };
    }

    throw new Error("Unsupported provider.");
  }

  async function chatSend() {
    const text = String(input.value || "").trim();
    if (!text) return;

    const go = text.match(/^\/go\s+(.+)$/i);
    if (go) {
      const cmd = go[1].trim().toLowerCase();
      const routes = {
        home: "/index.html",
        website: "/website/index.html",
        ai: "/website/ai/index.html",
        medicine: "/website/medicine/index.html",
        energy: "/website/energy/index.html",
        matrix: "/website/sections/matrix/index.html",
        admin: "/admin-chat.html?provider=guide",
      };
      const next = routes[cmd];
      if (next) {
        saveMessage("user", text, currentMode, currentProvider);
        appendMessage({
          role: "user",
          text,
          mode: currentMode,
          provider: currentProvider,
          t: Date.now(),
        });
        saveMessage(
          "bot",
          "Navigating to " + next,
          currentMode,
          currentProvider,
        );
        appendMessage({
          role: "bot",
          text: "Navigating to " + next,
          mode: currentMode,
          provider: currentProvider,
          t: Date.now(),
        });
        addXp(4);
        location.href = next;
        return;
      }
    }

    input.value = "";
    send.disabled = true;
    saveMessage("user", text, currentMode, currentProvider);
    appendMessage({
      role: "user",
      text,
      mode: currentMode,
      provider: currentProvider,
      t: Date.now(),
    });
    const pendingNode = appendMessage({
      role: "bot",
      text:
        currentProvider === "aria" ? "ARIA is connecting..." : "Thinking...",
      mode: currentMode,
      provider: currentProvider,
      t: Date.now(),
    });
    addXp(8);

    try {
      const result = await requestReply(text, pendingNode);
      lastAiResponse = result.text;
      lastInferenceMs = result.latencyMs;
      lastModel = result.model || providerModel(currentProvider);
      store.set("site_chat_last_response_v1", result.text);
      markPendingMessage(pendingNode, result.text);
      saveMessage("bot", result.text, currentMode, currentProvider);
      updateInferenceUi();
      addXp(14);
      if (currentMode === "tts") {
        await speakText(result.text);
      }
    } catch (error) {
      const message =
        "Chat error: " +
        (error && error.message ? error.message : "request failed");
      markPendingMessage(pendingNode, message);
      saveMessage("bot", message, currentMode, currentProvider);
      lastInferenceMs = null;
      updateInferenceUi();
      addXp(2);
    } finally {
      send.disabled = false;
      input.focus();
    }
  }

  send.addEventListener("click", chatSend);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      chatSend();
    }
  });
  providerSelect.addEventListener("change", () =>
    setProvider(providerSelect.value),
  );
  modeSelect.addEventListener("change", () => setMode(modeSelect.value));
  speakBtn.addEventListener("click", () => speakText(lastAiResponse));
  detailsBtn.addEventListener("click", () => {
    updateDrawer(!root.classList.contains("details-open"));
  });
  resetBtn.addEventListener("click", () => {
    root.style.left = "";
    root.style.top = "";
    root.style.right = "18px";
    root.style.bottom = "18px";
    localStorage.removeItem("site_chat_pos_v1");
  });
  minBtn.addEventListener("click", () => {
    root.classList.toggle("minimized");
    const minimized = root.classList.contains("minimized");
    minBtn.textContent = minimized ? "Open" : "Min";
    store.set("site_chat_min_v1", minimized);
  });
  closeBtn.addEventListener("click", () => setChatCollapsed(true));
  window.addEventListener("site-shell-open-chat", () => setChatCollapsed(false));
  // Start collapsed by default (first visit); otherwise honor the saved state.
  setChatCollapsed(store.get(collapsedKey, true));
  log.addEventListener("scroll", saveScroll);

  window.addEventListener("storage", (event) => {
    if (event.key === sharedProviderKey && event.newValue) {
      try {
        const nextProvider = JSON.parse(event.newValue);
        if (supportedProvider(nextProvider)) setProvider(nextProvider, false);
      } catch {}
    }
    if (event.key === sharedModeKey && event.newValue) {
      try {
        const nextMode = JSON.parse(event.newValue);
        setMode(nextMode, false);
      } catch {}
    }
  });
  window.addEventListener("site-chat-provider-change", (event) => {
    const provider = event?.detail?.provider;
    if (supportedProvider(provider)) setProvider(provider, false);
  });

  restoreHistory();
  if (!isAdminPage) {
    applyPos();
  } else {
    // Keep admin controls unobstructed by docking the companion widget.
    root.style.left = "";
    root.style.top = "";
    root.style.right = "18px";
    root.style.bottom = "18px";
  }
  paintXp();
  updateDrawer(drawerOpen);
  setProvider(currentProvider, false);
  setMode(currentMode, false);
  refreshRuntime();
  refreshBridge();
  const minimized = isAdminPage ? true : store.get("site_chat_min_v1", true);
  if (minimized) {
    root.classList.add("minimized");
    minBtn.textContent = "Open";
  }

  window.addEventListener("resize", () => {
    const pos = store.get("site_chat_pos_v1", null);
    if (pos) clampAndSave(pos.x, pos.y);
  });
  window.addEventListener("site-shell-open-chat", openFromShell);
  window.setInterval(refreshRuntime, 8000);
  window.setInterval(refreshBridge, 10000);
})();

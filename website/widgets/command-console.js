/* THE FUTURE 24/7 — Command Console
   The single, identical chat widget for every page. Replaces the section
   "movable-chat" and the main-page inline float. Shows, like Claude:
     • a running token counter (from /api/chat usage)
     • the active model + local/idle/active/offline status
     • Algalon's level (shared via localStorage so it's identical site-wide)
   Level-ups go to the Level Log tab, never the chat stream. */
(function () {
  // Suppress the legacy movable-chat even if its <script> still loads, so there
  // is never a second panel. (movable-chat checks this same flag.)
  window.__SITE_MOVABLE_CHAT_INIT__ = true;
  if (window.__CMD_CONSOLE_INIT__) return;
  window.__CMD_CONSOLE_INIT__ = true;

  var THREAD = "site-command-console";
  var XP_KEY = "site_chat_xp_v1";            // shared with old widget → continuity
  var HIST_KEY = "cc_history_v1";
  var COLLAPSE_KEY = "cc_collapsed_v1";
  var TOK_KEY = "cc_tokens_v1";
  var LOG_KEY = "cc_levellog_v1";

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function fmt(n) { n = Number(n) || 0; return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : String(n); }
  function now() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

  // ── State ──────────────────────────────────────────────────────────────
  var xp = store.get(XP_KEY, { level: 17, xp: 0, perLevel: 100, total: 1600 });
  if (!Number.isFinite(Number(xp.level))) xp = { level: 17, xp: 0, perLevel: 100, total: 1600 };
  var tokens = store.get(TOK_KEY, { in: 0, out: 0 });
  var levelLog = store.get(LOG_KEY, []);
  var currentModel = "…";
  var online = false;
  var sending = false;

  // ── Shell DOM ──────────────────────────────────────────────────────────
  var root = el("section"); root.id = "cmdConsole"; root.className = "cc-collapsed";
  root.setAttribute("aria-label", "Algalon chat console");

  var head = el("div", "cc-head");
  var titleRow = el("div", "cc-title");
  var orb = el("div", "cc-orb", "A");
  var titleCol = el("div");
  var name = el("div", "cc-name", "ALGALON");
  var statusLine = el("div", "cc-statusline cc-status--offline");
  var dot = el("span", "cc-dot");
  var statusText = el("span", "cc-status-text", "connecting…");
  statusLine.append(dot, statusText);
  titleCol.append(name, statusLine);
  var headRight = el("div", "cc-head-right");
  var lvlPill = el("div", "cc-lvl", "LVL " + xp.level);
  var modelPill = el("div", "cc-model"); modelPill.innerHTML = "model <i>…</i>";
  headRight.append(lvlPill, modelPill);
  var minBtn = el("button", "cc-min", "×"); minBtn.type = "button"; minBtn.title = "Close";
  titleRow.append(orb, titleCol, headRight);
  head.append(titleRow);

  // usage meter (Claude-style)
  var usage = el("div", "cc-usage");
  var tokTotal = el("b"); tokTotal.textContent = fmt(tokens.in + tokens.out);
  var tokLabel = el("span"); tokLabel.textContent = " tokens this session";
  var sep = el("span", "cc-usage-sep", "·");
  var tokIO = el("span", "cc-tok-io");
  usage.append(tokTotal, tokLabel, sep, tokIO);

  var tabs = el("div", "cc-tabs");
  var tabChat = el("button", "cc-tab active", "Chat"); tabChat.type = "button";
  var tabFeed = el("button", "cc-tab", "Intel Feed"); tabFeed.type = "button";
  var tabLevel = el("button", "cc-tab", "Level Log"); tabLevel.type = "button";
  tabs.append(tabChat, tabFeed, tabLevel);
  head.append(usage, tabs);
  head.append(minBtn);

  // Chat panel
  var chatPanel = el("div", "cc-panel active");
  var log = el("div", "cc-log");
  var quick = el("div", "cc-quick");
  [["📄 Explain this page", explainPage], ["🔥 Latest intel", function () { switchTab("feed"); }], ["📊 Rank AI tools", function () { input.value = "Which AI is best for coding right now?"; sendMsg(); }]].forEach(function (q) {
    var b = el("button", "cc-q", q[0]); b.type = "button"; b.addEventListener("click", q[1]); quick.appendChild(b);
  });
  var compose = el("div", "cc-compose");
  var input = el("textarea", ""); input.rows = 1; input.placeholder = "Ask Algalon anything…";
  var send = el("button", "cc-send", "➤"); send.type = "button";
  compose.append(input, send);
  chatPanel.append(log, quick, compose);

  // Feed panel
  var feedPanel = el("div", "cc-panel"); var feed = el("div", "cc-feed"); feedPanel.appendChild(feed);

  // Level panel
  var levelPanel = el("div", "cc-panel"); var levelBox = el("div", "cc-level"); levelPanel.appendChild(levelBox);

  root.append(head, chatPanel, feedPanel, levelPanel);
  document.body.appendChild(root);

  // FAB
  var fab = el("button", "cc-hidden"); fab.id = "cmdFab"; fab.type = "button"; fab.title = "Chat with Algalon"; fab.setAttribute("aria-label", "Open chat");
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"/></svg>';
  document.body.appendChild(fab);

  // ── Open / close ───────────────────────────────────────────────────────
  function setCollapsed(c) {
    root.classList.toggle("cc-collapsed", c);
    fab.classList.toggle("cc-hidden", !c);
    store.set(COLLAPSE_KEY, c);
    if (!c) setTimeout(function () { input.focus(); }, 120);
  }
  fab.addEventListener("click", function () { setCollapsed(false); });
  minBtn.addEventListener("click", function () { setCollapsed(true); });
  window.addEventListener("site-shell-open-chat", function () { setCollapsed(false); });
  // Compatibility: the homepage's old Chat/hero buttons call window.toggleFloat.
  window.toggleFloat = function (openArg) { setCollapsed(openArg === false ? true : false); };

  // ── Tabs ───────────────────────────────────────────────────────────────
  function switchTab(which) {
    [[tabChat, chatPanel, "chat"], [tabFeed, feedPanel, "feed"], [tabLevel, levelPanel, "level"]].forEach(function (t) {
      var on = t[2] === which;
      t[0].classList.toggle("active", on);
      t[1].classList.toggle("active", on);
    });
    if (which === "feed") loadFeed();
    if (which === "level") paintLevel();
  }
  tabChat.addEventListener("click", function () { switchTab("chat"); });
  tabFeed.addEventListener("click", function () { switchTab("feed"); });
  tabLevel.addEventListener("click", function () { switchTab("level"); });

  // ── Status + model ─────────────────────────────────────────────────────
  function setStatus(state, text) {
    statusLine.className = "cc-statusline cc-status--" + state;
    statusText.textContent = text;
  }
  function paintModel() { modelPill.innerHTML = "model <i>" + (currentModel || "…") + "</i>"; }
  function paintUsage() {
    tokTotal.textContent = fmt(tokens.in + tokens.out);
    tokIO.textContent = "↑" + fmt(tokens.in) + " ↓" + fmt(tokens.out);
    store.set(TOK_KEY, tokens);
  }
  async function refreshStatus() {
    if (sending) return;
    try {
      var r = await fetch("/api/chat-runtime-status", { headers: { Accept: "application/json" } });
      if (!r.ok) throw 0;
      var d = await r.json();
      online = d && d.liveLocal && d.liveLocal.online === true;
      if (d && d.models && !currentModel.match(/[a-z]/i)) { currentModel = d.models.algalon || d.models.guide || currentModel; paintModel(); }
      else if (d && d.models && currentModel === "…") { currentModel = d.models.algalon || d.models.guide; paintModel(); }
      setStatus(online ? "online" : "offline", online ? "Online · idle" : "Local AI offline");
    } catch (e) { online = false; setStatus("offline", "Offline"); }
  }

  // ── Level ──────────────────────────────────────────────────────────────
  function addXp(amount) {
    var v = Math.max(0, Number(amount) || 0); if (!v) return;
    xp.total = (Number(xp.total) || 0) + v;
    xp.xp = (Number(xp.xp) || 0) + v;
    xp.perLevel = Number(xp.perLevel) || 100;
    var leveled = false;
    while (xp.xp >= xp.perLevel) { xp.xp -= xp.perLevel; xp.level = (Number(xp.level) || 1) + 1; leveled = true; }
    store.set(XP_KEY, xp);
    lvlPill.textContent = "LVL " + xp.level;
    if (leveled) {
      levelLog.unshift({ lvl: xp.level, t: Date.now() });
      levelLog = levelLog.slice(0, 30);
      store.set(LOG_KEY, levelLog);
      tabLevel.innerHTML = 'Level Log <span class="cc-badge">!</span>';
    }
  }
  function paintLevel() {
    tabLevel.textContent = "Level Log";
    var pct = Math.max(0, Math.min(100, Math.round((xp.xp / (xp.perLevel || 100)) * 100)));
    levelBox.innerHTML = "";
    var big = el("div", "cc-level-big", "LEVEL " + xp.level);
    var sub = el("div", "cc-level-sub", "Algalon · Site Intelligence — grows as you explore and chat");
    var track = el("div", "cc-xp-track"); var fill = el("div", "cc-xp-fill"); fill.style.width = pct + "%"; track.appendChild(fill);
    var num = el("div", "cc-xp-num", xp.xp + " / " + xp.perLevel + " XP toward LVL " + (xp.level + 1) + "  ·  " + (xp.total || 0) + " total");
    levelBox.append(big, sub, track, num);
    var list = el("div", "cc-loglist");
    if (!levelLog.length) list.append(el("div", "cc-logrow", "No level-ups yet this session — keep chatting."));
    levelLog.forEach(function (e) {
      var row = el("div", "cc-logrow", "⚡ Reached Level " + e.lvl);
      var t = el("em", "", new Date(e.t).toLocaleString()); row.appendChild(t); list.appendChild(row);
    });
    levelBox.appendChild(list);
  }

  // ── Chat ───────────────────────────────────────────────────────────────
  function bubble(role, text) {
    var m = el("div", "cc-msg " + (role === "user" ? "user" : "bot"));
    m.append(el("div", "cc-who", role === "user" ? "You" : "Algalon"));
    var b = el("div", "cc-bubble", text); m.appendChild(b);
    log.appendChild(m); log.scrollTop = log.scrollHeight;
    return b;
  }
  function saveHist(role, text) { var h = store.get(HIST_KEY, []); h.push({ role: role, text: text, t: Date.now() }); store.set(HIST_KEY, h.slice(-40)); }

  function explainPage() {
    setCollapsed(false);
    var t = (document.querySelector("h1") || {}).textContent || document.title;
    input.value = "Explain what this page covers: " + String(t).trim();
    sendMsg();
  }

  async function sendMsg() {
    var text = String(input.value || "").trim();
    if (!text || sending) return;
    input.value = ""; input.style.height = "auto";
    bubble("user", text); saveHist("user", text);
    addXp(8);
    var pending = bubble("bot", "…"); pending.classList.add("cc-pending");
    sending = true; send.disabled = true; setStatus("active", "Thinking…");
    // rough input token estimate (chars/4) so counter moves even before reply
    var estIn = Math.max(1, Math.round(text.length / 4));
    try {
      var r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "algalon", prompt: text, message: text, threadId: THREAD }),
      });
      var d = await r.json();
      var reply = String((d && (d.text || d.response || d.error)) || "No response.");
      if (!r.ok) throw new Error(reply);
      pending.textContent = reply; saveHist("bot", reply);
      var u = d.usage || {};
      currentModel = u.model || currentModel; paintModel();
      tokens.in += Number(u.inputTokens) || estIn;
      tokens.out += Number(u.outputTokens) || Math.max(1, Math.round(reply.length / 4));
      paintUsage();
      addXp(14);
    } catch (e) {
      pending.textContent = "⚠ " + (e && e.message ? e.message : "request failed");
      tokens.in += estIn; paintUsage(); addXp(2);
    } finally {
      sending = false; send.disabled = false;
      setStatus(online ? "online" : "offline", online ? "Online · idle" : "Offline");
      input.focus();
    }
  }
  send.addEventListener("click", sendMsg);
  input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
  input.addEventListener("input", function () { input.style.height = "auto"; input.style.height = Math.min(120, input.scrollHeight) + "px"; });

  // ── Intel feed ─────────────────────────────────────────────────────────
  var feedLoaded = false;
  async function loadFeed() {
    if (feedLoaded) return; feedLoaded = true;
    feed.innerHTML = ""; feed.append(el("div", "cc-empty", "Loading latest intel…"));
    try {
      var r = await fetch("/api/world-data", { headers: { Accept: "application/json" } });
      var d = await r.json();
      var items = Array.isArray(d) ? d : (d.items || d.data || []);
      feed.innerHTML = "";
      if (!items.length) { feed.append(el("div", "cc-empty", "No intel available right now.")); return; }
      items.slice(-12).reverse().forEach(function (it) {
        var card = el("div", "cc-feed-item");
        card.append(el("div", "cc-feed-dom", String(it.domain || it.category || "INTEL")));
        card.append(el("div", "cc-feed-title", String(it.title || it.headline || it.name || "Update")));
        var txt = it.summary || it.description || it.text || it.detail || "";
        if (txt) card.append(el("div", "cc-feed-text", String(txt).slice(0, 220)));
        feed.appendChild(card);
      });
    } catch (e) { feed.innerHTML = ""; feed.append(el("div", "cc-empty", "Intel feed unavailable right now.")); }
  }

  // ── Boot ───────────────────────────────────────────────────────────────
  (store.get(HIST_KEY, []).slice(-24)).forEach(function (m) { bubble(m.role, m.text); });
  if (!store.get(HIST_KEY, []).length) bubble("bot", "Hi — I'm Algalon, this site's intelligence. Ask me about any domain, the latest breakthroughs, or which AI tools lead each task.");
  paintUsage(); paintModel();
  setCollapsed(store.get(COLLAPSE_KEY, true));
  refreshStatus();
  window.setInterval(refreshStatus, 9000);
})();

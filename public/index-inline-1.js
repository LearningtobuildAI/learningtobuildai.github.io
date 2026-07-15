
  /* ── Shared markdown renderer ── */
  function renderMd(raw) {
    if (!raw) return "";
    // Escape HTML to prevent injection
    let s = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    // Apply safe markdown patterns
    s = s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*\n]+?)\*/g, "<em>$1</em>")
      .replace(
        /`([^`\n]+?)`/g,
        '<code style="background:rgba(255,255,255,.1);padding:0 4px;border-radius:3px;font-size:11px;font-family:monospace;">$1</code>',
      )
      .replace(
        /^#{1,3} (.+)/gm,
        '<strong style="font-size:13px;">$1</strong>',
      )
      .replace(/^[-•] (.+)/gm, "&nbsp;&nbsp;· $1")
      .replace(/\n\n+/g, "<br><br>")
      .replace(/\n/g, "<br>");
    return s;
  }

  const chatBox = document.getElementById("chatBox");
  const chatInput = document.getElementById("chatInput");
  const chatSend = document.getElementById("chatSend");
  const chatModeHint = document.getElementById("chatModeHint");
  const providerButtons = document.querySelectorAll(".provider-btn");
  const chatUiReady = !!(chatBox && chatInput && chatSend && chatModeHint);
  let selectedProvider = "guide";

  // ── ARIA WebSocket state ──
  let ariaWs = null;
  let ariaSid = "site-" + Math.random().toString(36).slice(2, 8);
  let ariaReady = false;
  let ariaCurrentBody = null; // <div> being streamed into
  let ariaToolContainer = null; // step container for tool calls

  const PROVIDER_HINTS = {
    guide:
      "AI Team — 9-agent super intelligence across the full domain stack. Ask anything.",
    admin:
      '<span style="color:#818cf8;font-weight:700;">🧠 SUPER AI ACTIVE</span> — Deep analysis, site edits, ACTION: blocks, and multi-agent coordination.',
    aria: '<span style="color:#00c4ff;font-weight:700;">⚡ ARIA CONNECTED</span> — Full PC agent. Controls your computer, reads & writes files, runs code, builds workflows.',
    code: "Code AI — writes clean, functional code in any language.",
    edit: '<span style="color:#f97316;font-weight:700;">⚙ EDIT MODE ACTIVE</span> — Describe a site change and the AI will apply it directly to index.html. Refresh to see changes.',
  };

  providerButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      providerButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedProvider = btn.dataset.provider;
      if (!chatUiReady) return;
      chatModeHint.innerHTML = PROVIDER_HINTS[selectedProvider] || "";
      chatInput.placeholder =
        selectedProvider === "edit"
          ? 'Describe what to change — e.g. "change the hero headline to say The Future Is Now"'
          : selectedProvider === "aria"
            ? "Ask ARIA to do anything on your PC…"
            : "Ask anything…";
      if (selectedProvider === "aria") connectAria();
    });
  });

  // ── helpers ──
  function appendMsg(role, text, isHtml) {
    if (!chatUiReady) return document.createElement("div");
    const wrap = document.createElement("div");
    wrap.className = "chat-message" + (role === "user" ? " user" : "");
    const lbl = document.createElement("div");
    lbl.className = "label";
    lbl.textContent = role === "user" ? "You" : "Assistant";
    const body = document.createElement("div");
    if (isHtml) body.innerHTML = text;
    else body.innerHTML = renderMd(text);
    wrap.appendChild(lbl);
    wrap.appendChild(body);

    // Add copy button to bottom of message
    const copyBtn = document.createElement("button");
    copyBtn.className = "chat-copy-btn";
    copyBtn.innerHTML = "📋 Copy";
    copyBtn.style.cssText =
      "display:block;margin-top:8px;padding:4px 10px;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);border-radius:4px;color:#818cf8;font-size:11px;cursor:pointer;font-family:inherit;transition:all .2s;";
    copyBtn.onmouseover = () =>
      (copyBtn.style.background = "rgba(99,102,241,.2)");
    copyBtn.onmouseout = () =>
      (copyBtn.style.background = "rgba(99,102,241,.1)");
    copyBtn.onclick = () => {
      const textToCopy = body.innerText;
      navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = "✓ Copied!";
        copyBtn.style.color = "#22c55e";
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
          copyBtn.style.color = "#818cf8";
        }, 2000);
      });
    };
    wrap.appendChild(copyBtn);

    chatBox.appendChild(wrap);
    chatBox.scrollTop = chatBox.scrollHeight;
    return body;
  }

  // ── ARIA WebSocket ──
  function connectAria() {
    if (!chatUiReady) return;
    if (ariaWs && ariaWs.readyState === 1) {
      ariaReady = true;
      return;
    }
    ariaReady = false;
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ariaWs = new WebSocket(`${proto}://localhost:7000/ws/${ariaSid}`);
    ariaWs.onopen = () => {
      ariaReady = true;
      ariaWs.send(JSON.stringify({ type: "ping" }));
      chatModeHint.innerHTML = PROVIDER_HINTS.aria;
    };
    ariaWs.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      handleAriaMsg(msg);
    };
    ariaWs.onclose = () => {
      ariaReady = false;
      chatModeHint.innerHTML =
        '<span style="color:#ef4444">⚡ ARIA disconnected — reconnecting…</span>';
      setTimeout(() => {
        if (selectedProvider === "aria") connectAria();
      }, 2500);
    };
    ariaWs.onerror = () => {};
  }

  function handleAriaMsg(msg) {
    if (!chatUiReady) return;
    switch (msg.type) {
      case "pong":
      case "status":
        chatModeHint.innerHTML =
          PROVIDER_HINTS.aria +
          (msg.gpu
            ? ' <span style="color:#22c55e;font-size:10px;">⚡ GPU online</span>'
            : ' <span style="color:#64748b;font-size:10px;">✦ Claude</span>');
        chatSend.disabled = false;
        break;

      case "thinking_start":
        if (!ariaCurrentBody) {
          ariaCurrentBody = appendMsg(
            "assistant",
            '<em style="color:var(--muted);font-size:11px;">⚡ ARIA thinking…</em>',
            true,
          );
          ariaToolContainer = null;
        }
        break;

      case "thinking":
        if (ariaCurrentBody && msg.text) {
          ariaCurrentBody.innerHTML =
            '<em style="color:var(--muted);font-size:11px;">⚡ ' +
            (msg.text.slice(0, 120) || "Thinking…") +
            "</em>";
        }
        break;

      case "tool_call": {
        if (!ariaCurrentBody)
          ariaCurrentBody = appendMsg("assistant", "", true);
        // Add a small tool chip
        if (!ariaToolContainer) {
          ariaToolContainer = document.createElement("div");
          ariaToolContainer.style.cssText =
            "display:flex;flex-wrap:wrap;gap:4px;margin:4px 0";
          ariaCurrentBody.appendChild(ariaToolContainer);
        }
        const chip = document.createElement("span");
        chip.id = "tool-" + msg.id;
        chip.style.cssText =
          "background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);border-radius:4px;padding:2px 8px;font-size:10px;color:#818cf8;font-family:monospace";
        chip.textContent = "⚙ " + msg.name + "…";
        ariaToolContainer.appendChild(chip);
        chatBox.scrollTop = chatBox.scrollHeight;
        break;
      }

      case "tool_result": {
        const chip = document.getElementById("tool-" + msg.id);
        if (chip) chip.style.color = "#22c55e";
        chatBox.scrollTop = chatBox.scrollHeight;
        break;
      }

      case "screenshot": {
        const img = document.createElement("img");
        img.src = "data:image/png;base64," + msg.image;
        img.style.cssText =
          "max-width:100%;border-radius:6px;margin:6px 0;border:1px solid rgba(255,255,255,.1)";
        if (!ariaCurrentBody)
          ariaCurrentBody = appendMsg("assistant", "", true);
        ariaCurrentBody.appendChild(img);
        chatBox.scrollTop = chatBox.scrollHeight;
        break;
      }

      case "response": {
        if (ariaCurrentBody) {
          // Clear the thinking text, replace with final response
          const tools = ariaToolContainer;
          ariaCurrentBody.innerHTML = renderMd(msg.text);
          if (tools)
            ariaCurrentBody.insertBefore(tools, ariaCurrentBody.firstChild);
        } else {
          appendMsg("assistant", msg.text, false);
        }
        ariaCurrentBody = null;
        ariaToolContainer = null;
        chatSend.disabled = false;
        chatBox.scrollTop = chatBox.scrollHeight;
        break;
      }

      case "error": {
        if (ariaCurrentBody) {
          ariaCurrentBody.innerHTML = renderMd(
            "**⚠ ARIA error:** " + msg.text,
          );
          ariaCurrentBody.closest(".chat-message").style.borderLeft =
            "3px solid #ef4444";
        } else {
          const b = appendMsg(
            "assistant",
            "**⚠ ARIA error:** " + msg.text,
            false,
          );
          b.closest(".chat-message").style.borderLeft = "3px solid #ef4444";
        }
        ariaCurrentBody = null;
        ariaToolContainer = null;
        chatSend.disabled = false;
        break;
      }
    }
  }

  // ── main send ──
  async function sendPrompt() {
    if (!chatUiReady) return;
    const prompt = chatInput.value.trim();
    if (!prompt || chatSend.disabled) return;
    appendMsg("user", prompt, false);
    chatInput.value = "";
    chatSend.disabled = true;
    ariaCurrentBody = null;
    ariaToolContainer = null;

    // ARIA mode — WebSocket
    if (selectedProvider === "aria") {
      if (!ariaWs || ariaWs.readyState !== 1) {
        connectAria();
        setTimeout(() => {
          if (ariaWs && ariaWs.readyState === 1)
            ariaWs.send(JSON.stringify({ type: "message", text: prompt }));
          else {
            appendMsg(
              "assistant",
              "⚠ ARIA not connected. Make sure localhost:7000 is running.",
              true,
            );
            chatSend.disabled = false;
          }
        }, 1000);
        return;
      }
      ariaWs.send(JSON.stringify({ type: "message", text: prompt }));
      return; // response comes via handleAriaMsg
    }

    // EDIT mode
    if (selectedProvider === "edit") {
      const body = appendMsg(
        "assistant",
        '<em style="color:var(--muted);">Analysing site and preparing edit…</em>',
        true,
      );
      try {
        const res = await fetch("/api/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction: prompt }),
        });
        const data = await res.json();
        if (data.success) {
          const n = data.changes?.filter((c) => c.success).length || 1;
          body.innerHTML = renderMd(
            `**✓ Site Updated** — ${data.description}\n\n${n} change${n > 1 ? "s" : ""} applied. The page will refresh automatically when the new revision is detected.`,
          );
          body.closest(".chat-message").style.borderLeft =
            "3px solid #22c55e";
        } else {
          body.innerHTML = renderMd(
            `**⚠ Could not apply** — ${data.error || "Unknown error"}\n\nTry rephrasing — be specific about the exact text to change.`,
          );
          body.closest(".chat-message").style.borderLeft =
            "3px solid #ef4444";
        }
      } catch (err) {
        body.innerHTML = renderMd("**Error:** " + err.message);
      }
      chatSend.disabled = false;
      chatBox.scrollTop = chatBox.scrollHeight;
      return;
    }

    // AI Team / Guide / Admin / Code — REST
    const endpoint =
      selectedProvider === "guide" || selectedProvider === "admin"
        ? `http://localhost:7000/api/${selectedProvider}` // through ARIA
        : "/api/chat";
    const payload =
      selectedProvider === "guide" || selectedProvider === "admin"
        ? { message: prompt, prompt }
        : { provider: selectedProvider, prompt };

    const labelMap = {
      guide: "AI Team",
      admin: "🧠 Super AI",
      code: "Code AI",
    };
    const body = appendMsg(
      "assistant",
      '<em style="color:var(--muted);">Thinking…</em>',
      true,
    );
    body.closest(".chat-message").querySelector(".label").textContent =
      labelMap[selectedProvider] || "Assistant";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      body.innerHTML = renderMd(data.text || "");
      // Show action count for admin/super-AI responses
      if (data.actions && data.actions.length) {
        const note = document.createElement("div");
        note.style.cssText = "margin-top:6px;font-size:10px;color:#6366f1";
        note.textContent = `↳ ${data.actions.length} action${data.actions.length > 1 ? "s" : ""} extracted`;
        body.appendChild(note);
      }
    } catch (err) {
      body.innerHTML = renderMd("**Error:** " + err.message);
      body.closest(".chat-message").style.borderLeft = "3px solid #ef4444";
    }
    chatSend.disabled = false;
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  if (chatUiReady) {
    chatSend.addEventListener("click", sendPrompt);
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendPrompt();
      }
    });
  }

  /* ── Matrix filter ── */
  /* ── BRANCH EXPAND (domain overview cards) ── */
  function toggleBranch(card) {
    const isOpen = card.dataset.open === "true";
    card.dataset.open = isOpen ? "false" : "true";
    card.setAttribute("aria-expanded", isOpen ? "false" : "true");
  }

  /* ── MEDICINE ROW EXPAND ── */
  function toggleMed(id) {
    const row = document.getElementById("med-" + id);
    if (!row) return;
    const trigger = row.previousElementSibling;
    const isOpen = row.classList.contains("open");
    row.classList.toggle("open", !isOpen);
    row.style.display = isOpen ? "none" : "table-row";
    if (trigger) trigger.dataset.open = isOpen ? "" : "1";
  }

  /* ── GLOBAL LIVE FEED ── */

  let feedTimer = null;
  let feedCountdownVal = 90;

  function feedSourceEmoji(source) {
    const s = (source || "").toLowerCase();
    if (s.includes("nasa") || s.includes("space")) return "🚀";
    if (s.includes("bbc")) return "📡";
    if (s.includes("nature")) return "🔬";
    if (s.includes("techcrunch") || s.includes("tech")) return "⚡";
    if (s.includes("mit")) return "🧠";
    if (s.includes("health") || s.includes("nyt")) return "💊";
    if (s.includes("science")) return "🧪";
    if (s.includes("ars") || s.includes("phys")) return "⚛️";
    return "📰";
  }

  function fmtDate(str) {
    try {
      const d = new Date(str);
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return str || "";
    }
  }

  const ENABLE_REMOTE_THUMBS = false;

  function hashString(input) {
    const s = String(input || "future");
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function makeLocalThumb(label, accent) {
    const title = String(label || "Future Tech").trim();
    const initial = (title[0] || "F").toUpperCase();
    const hue = hashString(title) % 360;
    const accentColor = accent || `hsl(${hue} 85% 58%)`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#111c33"/></linearGradient></defs><rect width="64" height="64" rx="10" fill="url(#g)"/><circle cx="49" cy="15" r="18" fill="${accentColor}" opacity="0.25"/><text x="32" y="39" fill="#dbeafe" font-size="26" font-family="Segoe UI, Arial, sans-serif" font-weight="700" text-anchor="middle">${initial}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  async function loadFeed() {
    const dot = document.getElementById("feedDot");
    const status = document.getElementById("feedStatusText");
    const grid = document.getElementById("feedGrid");
    if (dot) {
      dot.className = "feed-pulse loading";
    }
    if (status) status.textContent = "Fetching updates…";
    grid.innerHTML =
      '<div class="feed-empty">Loading global progress updates…</div>';
    try {
      const res = await fetch("/api/feed");
      const data = await res.json();
      if (!data.items || !data.items.length) throw new Error("No items");
      const items = data.items;
      grid.innerHTML = items
        .map((it) => {
          const accent = it.color || "#00c4ff";
          const localThumb = makeLocalThumb(
            it.title || it.source || "Tech News",
            accent,
          );
          const imgAlt = (
            it.title ||
            it.source ||
            "Technology news image"
          ).replace(/"/g, "&quot;");
          const primaryThumb =
            ENABLE_REMOTE_THUMBS && it.thumb ? it.thumb : localThumb;
          const imgEl = `<img src="${primaryThumb}" class="feed-tile-img" style="width:64px;height:64px;border-radius:8px;object-fit:cover;flex-shrink:0;margin-right:12px;" alt="${imgAlt}" onerror="this.onerror=null;this.src='${localThumb}'">`;
          return `
      <div class="feed-card" style="display:flex;align-items:center;padding:12px 14px;overflow:hidden;">
        ${imgEl}
        <div style="flex:1;min-width:0;">
          <span class="feed-src" style="color:${accent}">${it.label || it.source || "Source"}</span>
          <div class="feed-title" style="margin-top:2px;">${it.title}</div>
          ${it.summary ? `<div class="feed-summary" style="margin-top:4px;">${it.summary}…</div>` : ""}
          <div class="feed-meta" style="margin-top:6px;">
            <span class="feed-date">${fmtDate(it.date)}</span>
            ${it.link ? `<a class="feed-link" href="${it.link}" target="_blank" rel="noopener">Read →</a>` : ""}
          </div>
        </div>
      </div>`;
        })
        .join("");
      if (dot) dot.className = "feed-pulse live";
      if (status)
        status.textContent =
          "Live — updated " +
          new Date().toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          });
    } catch (e) {
      grid.innerHTML =
        '<div class="feed-empty">Could not load feed. Run the server locally and ensure internet access, or click Refresh.</div>';
      if (dot) dot.className = "feed-pulse error";
      if (status) status.textContent = "Feed unavailable";
    }
    resetCountdown();
  }

  function resetCountdown() {
    clearInterval(feedTimer);
    feedCountdownVal = 90;
    feedTimer = setInterval(() => {
      feedCountdownVal--;
      const el = document.getElementById("feedCountdown");
      if (el)
        el.textContent =
          feedCountdownVal > 0
            ? "Next update in " + feedCountdownVal + "s"
            : "Refreshing…";
      if (feedCountdownVal <= 0) {
        loadFeed();
      }
    }, 1000);
  }

  /* ════════════════════════════════════════
   SITE SCHEMA — structured data foundation
   This object is the single source of truth for all domain knowledge.
   The AI reads this for context; the heatmap reads it for coordinates.
════════════════════════════════════════ */
  const SITE_SCHEMA = {
    version: "1.0",
    lastUpdated: "2026-06",
    domains: [
      {
        id: "ai",
        name: "AI & Computing",
        color: "#0ea5e9",
        maturity: 7,
        impact: 10,
        companies: 45,
        projects: 28,
        trl: 7,
        subdomains: [
          "Foundation Models",
          "AI Agents",
          "AI Hardware/Chips",
          "Robotics AI",
          "AI Safety & Alignment",
        ],
        currentTech: [
          "Claude Sonnet 4.6 / GPT-4.1 / Gemini 2.0 Flash",
          "Multimodal AI",
          "AI Coding Agents",
          "Transformer Architecture",
        ],
        futureTech: [
          "Artificial General Intelligence (5-15yr)",
          "Neuromorphic Computing (7-12yr)",
          "Quantum-AI Hybrid (15-25yr)",
        ],
        risks: [
          "Misalignment / Loss of control",
          "Power concentration",
          "Hallucination reliability",
          "Job displacement at scale",
        ],
        dependencies: [
          "GPU compute (NVIDIA H100/B200)",
          "Training data at scale",
          "Energy infrastructure",
        ],
        successors: ["AGI", "ASI", "Brain-computer interfaces"],
      },

      {
        id: "cur",
        name: "Current Technology",
        color: "#22c55e",
        maturity: 9,
        impact: 8,
        companies: 32,
        projects: 20,
        trl: 8,
        subdomains: [
          "Quantum Computing",
          "Blockchain & Web3",
          "5G / 6G",
          "IoT & Edge",
          "Autonomous Vehicles",
        ],
        currentTech: [
          "Quantum computers (NISQ era — 1000+ qubits)",
          "Smart contracts / DeFi",
          "5G mmWave networks",
          "SAE Level 3/4 self-driving",
        ],
        futureTech: [
          "Fault-tolerant quantum computing (8-15yr)",
          "6G global rollout (5-8yr)",
          "Full SAE Level 5 (5-10yr)",
        ],
        risks: [
          "Quantum error rates limit scale",
          "Blockchain energy use",
          "Cybersecurity of connected vehicles",
        ],
        dependencies: [
          "Semiconductor supply chain",
          "Fiber/wireless infrastructure",
          "Global standardisation",
        ],
        successors: [
          "Quantum internet",
          "Autonomous logistics networks",
          "Molecular computing",
        ],
      },

      {
        id: "fut",
        name: "Future Technology",
        color: "#a855f7",
        maturity: 2,
        impact: 10,
        companies: 20,
        projects: 15,
        trl: 2,
        subdomains: [
          "Molecular Machines",
          "Quantum Teleportation",
          "Post-Silicon Computing",
          "Consciousness Tech",
          "Programmable Matter",
        ],
        currentTech: [
          "Proof-of-concept molecular motors",
          "Qubit teleportation (lab scale)",
          "Photonic computing (IBM, Intel)",
        ],
        futureTech: [
          "Nano-assemblers (20-40yr)",
          "Macroscopic teleportation (50yr+)",
          "Mind uploading (30-50yr)",
          "Room-temp superconductors",
        ],
        risks: [
          "Existential risk from uncontrolled nanotech",
          "Physics limits on FTL",
          "Dual-use risk of molecular machines",
        ],
        dependencies: [
          "Advanced materials science",
          "Quantum computing maturity",
          "AI-driven design tools",
        ],
        successors: [
          "Post-scarcity manufacturing",
          "Type I civilisation energy systems",
        ],
      },

      {
        id: "med",
        name: "Medicine & Cures",
        color: "#ef4444",
        maturity: 6,
        impact: 10,
        companies: 85,
        projects: 40,
        trl: 6,
        subdomains: [
          "Oncology & Cancer",
          "Neurodegeneration",
          "Infectious Disease",
          "Gene Therapy",
          "Longevity & Aging",
        ],
        currentTech: [
          "mRNA vaccines (Moderna, BioNTech)",
          "CAR-T cell therapy",
          "CRISPR-Cas9 (Casgevy approved)",
          "GLP-1 weight loss drugs",
          "Immunotherapy checkpoints",
        ],
        futureTech: [
          "Universal cancer vaccine (5-10yr)",
          "Alzheimer cure (8-15yr)",
          "Aging reversal / senolytics (15-25yr)",
          "Organ-on-chip drug testing",
        ],
        risks: [
          "Drug resistance evolution",
          "70%+ clinical trial failure rate",
          "Access inequality (low-income nations)",
          "Off-target CRISPR edits",
        ],
        dependencies: [
          "AI drug discovery (AlphaFold)",
          "Biotech manufacturing scale",
          "Regulatory approval pathways (FDA, EMA)",
        ],
        successors: [
          "Personalised genome medicine",
          "Nanobots for drug delivery",
          "Biological age reversal",
        ],
      },

      {
        id: "nrg",
        name: "Energy",
        color: "#f59e0b",
        maturity: 6,
        impact: 9,
        companies: 40,
        projects: 25,
        trl: 6,
        subdomains: [
          "Nuclear Fusion",
          "Solar & Wind",
          "Green Hydrogen",
          "Solid-State Batteries",
          "Smart Grid / Storage",
        ],
        currentTech: [
          "Utility solar (LCOE < $0.02/kWh)",
          "Li-ion grid storage (Fluence, Tesla)",
          "Small modular reactors (NuScale)",
          "Offshore wind (Orsted, Vestas)",
        ],
        futureTech: [
          "Commercial fusion power plant (8-15yr)",
          "Solid-state EV batteries (3-7yr)",
          "Space-based solar power (20-30yr)",
          "Thorium MSR reactors",
        ],
        risks: [
          "Grid instability from intermittent renewables",
          "Critical mineral supply (lithium, cobalt)",
          "Nuclear waste storage",
          "Energy poverty gap (800M without power)",
        ],
        dependencies: [
          "Advanced materials (electrolytes, membranes)",
          "AI grid management",
          "Policy and carbon pricing",
        ],
        successors: [
          "Fusion-powered global grid",
          "Hydrogen economy",
          "Kardashev Type I energy civilisation",
        ],
      },

      {
        id: "mat",
        name: "Advanced Materials",
        color: "#a855f7",
        maturity: 5,
        impact: 8,
        companies: 28,
        projects: 18,
        trl: 5,
        subdomains: [
          "Graphene & 2D Materials",
          "Metamaterials",
          "Perovskites",
          "Biocomposites",
          "Self-Healing Materials",
        ],
        currentTech: [
          "Commercial graphene (First Graphene, Graphenea)",
          "Carbon nanotubes (CNT fibres)",
          "Perovskite solar cells (25%+ efficiency)",
          "Aerogels for insulation",
        ],
        futureTech: [
          "Room-temperature superconductors (10-25yr)",
          "Self-healing polymers at scale (5-10yr)",
          "Programmable smart matter (20-30yr)",
        ],
        risks: [
          "Nano-toxicology unknowns (lung/CNS)",
          "Manufacturing scale-up cost",
          "IP concentration in few labs",
        ],
        dependencies: [
          "Precision manufacturing (atomic layer deposition)",
          "AI materials discovery (GNoME)",
          "Computational modelling",
        ],
        successors: [
          "Molecular manufacturing",
          "Self-assembling nanostructures",
        ],
      },

      {
        id: "neu",
        name: "Neurotech & BCI",
        color: "#6366f1",
        maturity: 4,
        impact: 9,
        companies: 22,
        projects: 14,
        trl: 4,
        subdomains: [
          "Brain-Computer Interfaces",
          "Neural Implants",
          "Cognitive Enhancement",
          "Neural Signal Decoding",
          "Brain-to-Brain Communication",
        ],
        currentTech: [
          "Neuralink N1 (1024 electrodes, paralysis patients)",
          "Synchron Stentrode (blood-vessel BCI)",
          "DBS for Parkinson's & depression",
          "EEG headsets (Emotiv, OpenBCI)",
        ],
        futureTech: [
          "Full-bandwidth wireless BCI (5-10yr)",
          "Memory augmentation implants (10-20yr)",
          "Brain-to-brain communication (20-30yr)",
        ],
        risks: [
          "Privacy of thought / mental surveillance",
          "Hacking neural implants",
          "Enhancement inequality",
          "Long-term glial scar tissue formation",
        ],
        dependencies: [
          "Biocompatible flexible electronics",
          "AI signal decoding (100M neurons)",
          "Wireless power delivery to implants",
        ],
        successors: [
          "Merged human-AI cognition",
          "Neural cloud computing",
          "Post-biological intelligence",
        ],
      },

      {
        id: "spc",
        name: "Space & Robotics",
        color: "#94a3b8",
        maturity: 5,
        impact: 8,
        companies: 35,
        projects: 22,
        trl: 5,
        subdomains: [
          "Heavy Lift Launch",
          "Lunar Infrastructure",
          "Mars Colonisation",
          "Humanoid Robots",
          "Satellite Mega-Constellations",
        ],
        currentTech: [
          "SpaceX Starship (fully reusable)",
          "ISS / commercial stations (Axiom)",
          "Figure 02 & Tesla Optimus humanoids",
          "Starlink 6000+ satellites",
        ],
        futureTech: [
          "Permanent lunar base (5-10yr)",
          "First humans on Mars (5-8yr)",
          "1000+ humanoid robots in factories (3-5yr)",
          "Space mining (10-20yr)",
        ],
        risks: [
          "Kessler syndrome (orbital debris cascade)",
          "Life support failure on Mars",
          "Humanoid safety in human environments",
          "Planetary protection contamination",
        ],
        dependencies: [
          "ISRU (oxygen/water from regolith)",
          "AI autonomy for remote operations",
          "Launch cost < $100/kg to LEO",
        ],
        successors: [
          "Mars colony self-sufficiency",
          "Asteroid mining economy",
          "Solar system civilisation",
        ],
      },

      {
        id: "sec",
        name: "Cybersecurity",
        color: "#f97316",
        maturity: 6,
        impact: 8,
        companies: 30,
        projects: 16,
        trl: 6,
        subdomains: [
          "Post-Quantum Cryptography",
          "Zero-Trust Architecture",
          "AI Security",
          "Biometric Auth",
          "Threat Intelligence AI",
        ],
        currentTech: [
          "CRYSTALS-Kyber PQC (NIST 2024 standard)",
          "SASE zero-trust platforms (Zscaler, Cloudflare)",
          "AI-powered SOC (Crowdstrike Falcon)",
          "Passkeys / FIDO2",
        ],
        futureTech: [
          "Quantum-safe global internet (5-10yr)",
          "Autonomous AI cyber defender (3-7yr)",
          "Behavioural biometrics authentication (3-5yr)",
        ],
        risks: [
          "Nation-state APT attacks (China, Russia, N. Korea)",
          "Harvest-now-decrypt-later quantum threat",
          "AI-generated spear phishing at scale",
          "Software supply chain attacks",
        ],
        dependencies: [
          "Post-quantum standards (NIST, ETSI)",
          "AI capabilities for attack/defence",
          "Hardware security modules",
        ],
        successors: [
          "AI-native security fabric",
          "Zero-knowledge proof-based internet",
          "Quantum communication network",
        ],
      },

      {
        id: "gov",
        name: "Global Governance",
        color: "#14b8a6",
        maturity: 4,
        impact: 7,
        companies: 18,
        projects: 12,
        trl: 4,
        subdomains: [
          "AI Regulation",
          "Digital Identity",
          "Climate Policy",
          "Global Health Systems",
          "Digital Currencies (CBDC)",
        ],
        currentTech: [
          "EU AI Act (2024 — world's first AI law)",
          "WHO Pandemic Treaty negotiations",
          "CBDC pilots (China, EU, Nigeria)",
          "Digital public infrastructure (India Stack)",
        ],
        futureTech: [
          "Global AI governance framework (3-7yr)",
          "Universal digital identity (5-10yr)",
          "AI-assisted policymaking (10-20yr)",
        ],
        risks: [
          "Regulatory fragmentation (US vs EU vs China)",
          "Authoritarian use of digital surveillance",
          "Treaty non-compliance and enforcement gaps",
          "Democratic erosion via AI propaganda",
        ],
        dependencies: [
          "International cooperation (G7, G20, UN)",
          "Technical standards bodies (ISO, IEEE, ITU)",
          "Political will for global coordination",
        ],
        successors: [
          "AI-governed global commons",
          "Planetary coordination systems",
        ],
      },

      {
        id: "bld",
        name: "Smart Construction",
        color: "#d97706",
        maturity: 5,
        impact: 7,
        companies: 20,
        projects: 14,
        trl: 5,
        subdomains: [
          "3D-Printed Buildings",
          "Living / Biological Materials",
          "Smart City OS",
          "Underground Infrastructure",
          "BIM & Digital Twins",
        ],
        currentTech: [
          "ICON Vulcan 3D concrete printing",
          "BIM (Autodesk Revit, Bentley)",
          "Smart building energy management",
          "Prefab modular housing (Katerra model)",
        ],
        futureTech: [
          "Fully 3D-printed cities (10-20yr)",
          "Self-repairing living buildings (10-20yr)",
          "Underground city networks (20-40yr)",
          "AI autonomous construction robots",
        ],
        risks: [
          "Building code lag behind innovation",
          "Material fire and safety certification",
          "Cybersecurity of smart infrastructure",
          "Workforce displacement",
        ],
        dependencies: [
          "Advanced materials (bio-concrete, mycelium)",
          "Autonomous robotics",
          "AI design and structural analysis",
        ],
        successors: [
          "Programmable built environment",
          "Orbital habitat construction",
          "Self-building infrastructure",
        ],
      },

      {
        id: "cos",
        name: "Cosmetics & Bio-Enhancement",
        color: "#ec4899",
        maturity: 5,
        impact: 6,
        companies: 25,
        projects: 16,
        trl: 5,
        subdomains: [
          "Longevity Science",
          "Epigenetic Reprogramming",
          "Gene Therapy Cosmetics",
          "Sensory Enhancement",
          "Biohacking",
        ],
        currentTech: [
          "Senolytics (dasatinib+quercetin in trials)",
          "NAD+ / rapamycin longevity protocols",
          "Retinol / tretinoin science",
          "GLP-1 aesthetic repurposing",
        ],
        futureTech: [
          "Epigenetic age reversal to cellular youth (10-20yr)",
          "Designer sensory enhancement (15-25yr)",
          "Gene-edited appearance (20-30yr)",
        ],
        risks: [
          "Access inequality — only for the wealthy",
          "Unregulated biohacking clinics",
          "Off-target genetic effects",
          "Social pressure to enhance",
        ],
        dependencies: [
          "Gene therapy delivery vectors",
          "AI personalisation of interventions",
          "Biomarker testing and monitoring",
        ],
        successors: [
          "Biological age reversal",
          "Transhumanist body design",
          "Post-biological human form",
        ],
      },

      {
        id: "smt",
        name: "Smart Systems",
        color: "#14b8a6",
        maturity: 6,
        impact: 8,
        companies: 50,
        projects: 22,
        trl: 6,
        subdomains: [
          "Smart City Platforms",
          "Industrial IoT / Industry 4.0",
          "Precision Agriculture",
          "Digital Twins",
          "Autonomous Logistics",
          "V2G Networks",
        ],
        currentTech: [
          "Smart city platforms / Industrial IoT / Precision agriculture / Digital twins",
        ],
        futureTech: [
          "Autonomous logistics / V2G networks / Digital twin cities / Vertical farming at scale",
        ],
        farTech: [
          "Autonomous city OS / Global transcontinental smart grid / Satellite IoT layer",
        ],
        risks: [
          "Cybersecurity of critical infrastructure",
          "Digital divide in smart city access",
          "Data privacy from pervasive sensors",
          "Single points of failure in networked cities",
        ],
        dependencies: [
          "5G / 6G connectivity",
          "AI analytics platforms",
          "IoT sensor hardware at scale",
          "Edge computing infrastructure",
        ],
        successors: [
          "Autonomous city OS",
          "Global transcontinental smart grid",
          "Planetary sensor layer",
        ],
      },

      {
        id: "agri",
        name: "AgriTech & Food Systems",
        color: "#22c55e",
        maturity: 6,
        impact: 8,
        companies: 30,
        projects: 18,
        trl: 6,
        subdomains: [
          "Precision Farming",
          "Farm Robotics",
          "Vertical Farming",
          "Alternative Proteins",
          "Smart Aquaculture",
        ],
        currentTech: [
          "Autonomous tractors",
          "Crop-monitoring drones",
          "Livestock biometric monitoring",
          "Precision fermentation",
        ],
        futureTech: [
          "Autonomous farm networks (5-10yr)",
          "Commercial vertical farming scale-out (5-10yr)",
          "Cultivated meat price parity (10-20yr)",
        ],
        risks: [
          "Food supply concentration",
          "Biosecurity in controlled farms",
          "High energy demand for indoor agriculture",
          "Water access inequality",
        ],
        dependencies: [
          "Satellite sensing",
          "AI agronomy models",
          "Robotics at field scale",
          "Cold-chain logistics",
        ],
        successors: [
          "Fully autonomous farms",
          "Planetary food optimisation",
          "Closed-loop bio-industrial agriculture",
        ],
      },

      {
        id: "domain-syn",
        name: "Synthetic Biology",
        color: "#22c55e",
        icon: "⬡",
        currentTech:
          "AI protein design / Ginkgo bio-foundry / Synthetic spider silk / Precision fermentation",
        nearTech:
          "Synthetic genomes / Xenobiology / Living materials / Cell-free systems",
        farTech:
          "De novo life forms / DNA computing / Synthetic ecosystems / Terraforming biology",
        companies: 45,
        maturity: 5,
        trl: 5,
        impact: 9,
      },
      {
        id: "3dp",
        name: "3D Printing",
        color: "#f97316",
        maturity: 6,
        impact: 8,
        companies: 40,
        projects: 20,
        trl: 6,
        subdomains: [
          "Industrial",
          "Medical Bioprinting",
          "Construction",
          "Metal Additive",
          "Polymer",
          "Food Printing",
          "Micro-fabrication",
        ],
        currentTech: [
          "Powder bed fusion",
          "FDM polymer lines",
          "Bioprinting scaffolds",
          "Construction gantry printers",
        ],
        futureTech: [
          "High-speed multi-material systems",
          "Printed electronics at scale",
          "In-hospital tissue manufacturing",
        ],
        risks: [
          "Unsafe printed pressure parts",
          "Material contamination",
          "Unvalidated medical prints",
          "Weaponisation attempts",
        ],
        dependencies: [
          "Advanced materials",
          "Machine vision QA",
          "Digital twin calibration",
        ],
        successors: [
          "Autonomous print farms",
          "Localized manufacturing grids",
        ],
      },
      {
        id: "robotics",
        name: "Robotics",
        color: "#0ea5e9",
        maturity: 7,
        impact: 9,
        companies: 70,
        projects: 30,
        trl: 7,
        subdomains: [
          "Industrial",
          "Medical",
          "Service",
          "Humanoids",
          "Autonomous Vehicles",
          "Warehouse",
          "Agriculture",
          "Construction",
        ],
        currentTech: [
          "Industrial arms",
          "AMR fleets",
          "Surgical robotics",
          "Warehouse automation",
        ],
        futureTech: [
          "General-purpose humanoids",
          "Dexterous manipulation at scale",
          "Robot-first logistics corridors",
        ],
        risks: [
          "Workforce displacement",
          "Safety incidents",
          "Cyber-physical security",
        ],
        dependencies: ["AI perception", "Battery systems", "Edge compute"],
        successors: [
          "Multi-robot city infrastructure",
          "Robot-native production chains",
        ],
      },
      {
        id: "autojobs",
        name: "Automation Jobs",
        color: "#14b8a6",
        maturity: 7,
        impact: 9,
        companies: 100,
        projects: 40,
        trl: 7,
        subdomains: [
          "Construction",
          "Healthcare",
          "Retail",
          "Logistics",
          "Manufacturing",
          "Agriculture",
          "Mining",
          "Energy",
          "Hospitality",
          "Finance",
          "Transportation",
          "Education",
          "Government",
          "IT/Cyber",
          "Media",
        ],
        currentTech: [
          "RPA",
          "Industrial automation",
          "Vision QA",
          "Workflow orchestration",
        ],
        futureTech: [
          "Fully autonomous back-office loops",
          "Cross-industry autonomous operations",
        ],
        risks: [
          "Governance gaps",
          "Bias in automation decisions",
          "Operational over-dependence",
        ],
        dependencies: [
          "Process mapping",
          "Reliable telemetry",
          "Human-in-the-loop controls",
        ],
        successors: ["Autonomous enterprise operating systems"],
      },
    ],
  };

  function getTrackedDomainSections() {
    return Array.from(
      document.querySelectorAll('section.domain-sec[id^="domain-"]'),
    );
  }

  function getTrackedDomainTotal() {
    return (
      getTrackedDomainSections().length ||
      (Array.isArray(SITE_SCHEMA?.domains)
        ? SITE_SCHEMA.domains.length
        : 14)
    );
  }

  function getVisibleDomainRatio(activeOverride) {
    const total = getTrackedDomainTotal();
    const active = Math.max(
      1,
      Math.min(
        total,
        typeof activeOverride === "number" ? activeOverride : total,
      ),
    );
    return { active, total, full: `${active}/${total}` };
  }

  function syncDomainCounters(activeOverride) {
    const full = getVisibleDomainRatio();
    const active = getVisibleDomainRatio(activeOverride ?? full.total);
    const heroBadge = document.getElementById("heroDomainBadge");
    const matrixInline = document.getElementById("matrixDomainInline");
    const matrixCount = document.getElementById("matrixDomainCount");
    const summaryStatus = document.getElementById("summaryDomainStatus");
    const summaryStatusLegacy = document.getElementById(
      "summaryDomainStatusLegacy",
    );
    const aboutDomainCount = document.getElementById("aboutDomainCount");
    const aboutDomainCopy = document.getElementById("aboutDomainCopy");
    const serviceDomainCopy = document.getElementById("serviceDomainCopy");
    const rankingSummary = document.getElementById("aiRankingSummary");

    if (heroBadge) heroBadge.textContent = `${full.full} Domains`;
    if (matrixInline) matrixInline.textContent = `${full.full} domains`;
    if (matrixCount) matrixCount.textContent = full.full;
    if (summaryStatus)
      summaryStatus.textContent = `${active.full} DOMAINS ACTIVE`;
    if (summaryStatusLegacy)
      summaryStatusLegacy.textContent = `${active.full} DOMAINS ACTIVE`;
    if (aboutDomainCount) aboutDomainCount.textContent = full.full;
    if (aboutDomainCopy)
      aboutDomainCopy.textContent = `The Future 24/7 is a live AI-powered technology intelligence platform. We track ${full.full} technology domains — from AI and medicine to quantum computing, energy, and space — scanning thousands of research sources daily and classifying breakthroughs in real time.`;
    if (serviceDomainCopy)
      serviceDomainCopy.textContent = `${full.total} technology domains tracked from AI and computing to cosmetics and governance — every subdomain, company, and breakthrough classified and mapped live.`;
    if (rankingSummary)
      rankingSummary.textContent = `How The Future 24/7 AI system measures up against leading AI platforms across 8 core intelligence metrics. Score out of 100 — updated with every autonomous cycle and re-evaluated whenever Algalon levels up across ${full.full} live domains.`;
  }

  /* ════ HEATMAP RENDERER ════ */
  function drawHeatmap() {
    const svg = document.getElementById("heatmapSvg");
    const legend = document.getElementById("heatmapLegend");
    const W = 560,
      H = 380;
    const pad = { left: 56, right: 20, top: 24, bottom: 44 };
    const pw = W - pad.left - pad.right;
    const ph = H - pad.top - pad.bottom;

    // Calculate max maturity and impact dynamically (unlimited scale)
    const maxMaturity = Math.max(
      ...SITE_SCHEMA.domains.map((d) => d.maturity),
      10,
    );
    const maxImpact = Math.max(
      ...SITE_SCHEMA.domains.map((d) => d.impact),
      10,
    );
    const gridStep = Math.ceil(maxMaturity / 4); // 4 grid divisions

    const toX = (m) => pad.left + (m / maxMaturity) * pw;
    const toY = (i) => pad.top + ((maxImpact - i) / maxImpact) * ph;
    const toR = (c) => Math.max(10, Math.min(28, 8 + c / 5));

    let markup = `
    <!-- Grid lines -->
    <rect x="${pad.left}" y="${pad.top}" width="${pw}" height="${ph}" fill="rgba(255,255,255,.02)" rx="4"/>
    ${Array.from({ length: 4 }, (_, i) => (i + 1) * gridStep)
      .map(
        (v) => `
      <line x1="${toX(v)}" y1="${pad.top}" x2="${toX(v)}" y2="${pad.top + ph}" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
      <line x1="${pad.left}" y1="${toY(v)}" x2="${pad.left + pw}" y2="${toY(v)}" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
    `,
      )
      .join("")}
    <!-- Axis labels -->
    <text x="${pad.left + pw / 2}" y="${H - 6}" text-anchor="middle" fill="#64748b" font-size="10" font-family="sans-serif">MATURITY →</text>
    <text x="13" y="${pad.top + ph / 2}" text-anchor="middle" fill="#64748b" font-size="10" font-family="sans-serif" transform="rotate(-90,13,${pad.top + ph / 2})">IMPACT ↑</text>
    ${Array.from(
      { length: Math.min(11, maxMaturity + 1) },
      (_, i) => i * Math.ceil(maxMaturity / 10),
    )
      .filter((v) => v <= maxMaturity)
      .map(
        (v) => `
      <text x="${toX(v)}" y="${pad.top + ph + 14}" text-anchor="middle" fill="#475569" font-size="8" font-family="sans-serif">${v}</text>
      <text x="${pad.left - 6}" y="${toY(v) + 4}" text-anchor="end" fill="#475569" font-size="8" font-family="sans-serif">${v}</text>
    `,
      )
      .join("")}
    <!-- Quadrant labels -->
    <text x="${toX(maxMaturity * 0.15)}" y="${toY(maxImpact * 0.85)}" text-anchor="middle" fill="rgba(239,68,68,.25)" font-size="9" font-family="sans-serif">HIGH IMPACT</text>
    <text x="${toX(maxMaturity * 0.15)}" y="${toY(maxImpact * 0.82)}" text-anchor="middle" fill="rgba(239,68,68,.25)" font-size="9" font-family="sans-serif">LOW MATURITY</text>
    <text x="${toX(maxMaturity * 0.85)}" y="${toY(maxImpact * 0.85)}" text-anchor="middle" fill="rgba(34,197,94,.2)" font-size="9" font-family="sans-serif">DEPLOYED</text>
    <text x="${toX(maxMaturity * 0.85)}" y="${toY(maxImpact * 0.82)}" text-anchor="middle" fill="rgba(34,197,94,.2)" font-size="9" font-family="sans-serif">HIGH IMPACT</text>
  `;

    // Render bubbles
    SITE_SCHEMA.domains.forEach((d) => {
      const cx = toX(d.maturity);
      const cy = toY(d.impact);
      const r = toR(d.companies);
      const abbr = d.name.split(" ")[0].slice(0, 5).toUpperCase();
      markup += `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${d.color}" fill-opacity=".22" stroke="${d.color}" stroke-width="1.5" stroke-opacity=".7"/>
      <text x="${cx}" y="${cy + 3}" text-anchor="middle" fill="${d.color}" font-size="7" font-family="sans-serif" font-weight="700">${abbr}</text>
    `;
    });

    svg.innerHTML = markup;

    // Legend
    legend.innerHTML = SITE_SCHEMA.domains
      .map(
        (d) =>
          `<div class="heatmap-leg-item"><span class="heatmap-leg-dot" style="background:${d.color};"></span>${d.name.split(" ")[0]}</div>`,
      )
      .join("");
  }

  /* ════ SCHEMA DOMAIN CARDS ════ */
  function drawSchemaGrid() {
    const grid = document.getElementById("schemaGrid");
    if (!grid) return;
    grid.innerHTML = SITE_SCHEMA.domains
      .map(
        (d) => `
    <div class="schema-domain-card" style="border-color:${d.color}22;">
      <div class="sdc-name" style="color:${d.color};">${d.name.split(" ").slice(0, 2).join(" ")}</div>
      <div class="sdc-stats">
        <span>${d.companies} cos</span>
        <span>TRL ${d.trl}</span>
        <span>${d.maturity}/10 mat</span>
      </div>
      <div class="trl-bar"><div class="trl-fill" style="width:${(d.trl / 9) * 100}%;background:${d.color};"></div></div>
    </div>
  `,
      )
      .join("");
  }

  /* ════ GAP ANALYSIS ════ */
  async function runGapAnalysis() {
    const btn = document.querySelector('[onclick="runGapAnalysis()"]');
    const result = document.getElementById("gapResult");
    const icon = document.getElementById("gapBtnIcon");

    btn.disabled = true;
    icon.innerHTML = '<span class="intel-spinner"></span>';
    result.className = "intel-result visible";
    result.innerHTML =
      '<em style="color:var(--muted);">Scanning all 14 domains for missing content… this may take 15–20 seconds.</em>';

    try {
      const res = await fetch("/api/gaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema: SITE_SCHEMA }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      result.innerHTML = renderMd(
        data.text || data.analysis || "Analysis complete.",
      );
    } catch (err) {
      result.innerHTML = renderMd(
        "**Error:** " +
          err.message +
          "\n\nStart the server with `npm start` and ensure your API key is set in `.env`",
      );
    }

    btn.disabled = false;
    icon.textContent = "🔍";
  }

  /* ════ SELF-IMPROVEMENT ════ */
  async function runSelfImprove() {
    const btn = document.querySelector('[onclick="runSelfImprove()"]');
    const result = document.getElementById("improveResult");
    const icon = document.getElementById("improveBtnIcon");

    btn.disabled = true;
    icon.innerHTML = '<span class="intel-spinner"></span>';
    result.className = "intel-result visible";
    result.innerHTML =
      '<em style="color:var(--muted);">AI is reviewing its own system, prompts, and the site coverage… allow 15–25 seconds.</em>';

    try {
      const res = await fetch("/api/selfimprove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema: SITE_SCHEMA }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      result.innerHTML = renderMd(
        data.text || "Improvement analysis complete.",
      );
    } catch (err) {
      result.innerHTML = renderMd("**Error:** " + err.message);
    }

    btn.disabled = false;
    icon.textContent = "⚡";
  }

  /* ════ DOMAIN AGENT ════ */
  async function runDomainAgent() {
    const domainId = document.getElementById("agentDomainSelect").value;
    const query = document.getElementById("agentQuery").value.trim();
    const btn = document.querySelector('[onclick="runDomainAgent()"]');
    const result = document.getElementById("agentResult");
    const icon = document.getElementById("agentBtnIcon");

    if (!query) {
      result.className = "intel-result visible";
      result.innerHTML =
        '<em style="color:#f97316;">Enter a question or goal for the domain agent.</em>';
      return;
    }

    btn.disabled = true;
    icon.innerHTML = '<span class="intel-spinner"></span>';
    result.className = "intel-result visible";
    result.innerHTML =
      '<em style="color:var(--muted);">Domain agent thinking… generating solution roadmap…</em>';

    const domain = SITE_SCHEMA.domains.find((d) => d.id === domainId);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      result.innerHTML = renderMd(data.text || "Agent response complete.");
    } catch (err) {
      result.innerHTML = renderMd(
        "**Error:** " +
          err.message +
          "\n\nStart the server with `npm start`.",
      );
    }

    btn.disabled = false;
    icon.textContent = "🎯";
  }

  /* ════ AI GLOBAL RANKING ════ */
  const AI_RANKINGS = [
    {
      metric: "Domain Coverage",
      emoji: "🗺️",
      score: 91,
      color: "#0ea5e9",
      desc: "Tracks 14 live technology domains — AI, Energy, Medicine, Space, Materials, Neurotech, Cyber, Smart Systems, Synthetic Biology, Governance, Construction, Cosmetics, Future Tech, Current Tech.",
      improve:
        "Add Quantum Systems, Consciousness Science, and Climate Tech as dedicated domains. Expand coverage depth inside each existing domain with more sub-categories and company-level tracking.",
    },
    {
      metric: "Real-Time Updates",
      emoji: "⚡",
      score: 88,
      color: "#22c55e",
      desc: "Live RSS feeds refreshed every 90 seconds from 9 authoritative science and tech sources. World Intel cards updated via autonomous scan on every cycle.",
      improve:
        "Add Twitter/X API feeds, arXiv preprint stream, and patent filings for cutting-edge early signals. Add breaking-news push alerts for major tech events.",
    },
    {
      metric: "Autonomous Operation",
      emoji: "🤖",
      score: 85,
      color: "#a855f7",
      desc: "10-agent intelligence system runs self-improvement, knowledge mapping, and evolution cycles continuously without human input. Three parallel modes based on cycle depth.",
      improve:
        "Add a memory consolidation agent that merges redundant knowledge. Build cross-domain reasoning that connects breakthroughs across domains in real time.",
    },
    {
      metric: "Knowledge Depth",
      emoji: "🔬",
      score: 78,
      color: "#00c4ff",
      desc: "220+ World Intel cards, 200+ companies tracked, 30+ disease pathways, 22+ energy sources, 384 image slots mapped to specific technologies.",
      improve:
        "Integrate PubMed API for live scientific literature. Add Crunchbase funding data for company profiles. Connect ClinicalTrials.gov for live medical research tracking.",
    },
    {
      metric: "Entity Mapping",
      emoji: "🕸️",
      score: 74,
      color: "#f59e0b",
      desc: "Knowledge graph linking companies, technologies, people, and domains. Entity relationships tracked and updated autonomously via the Knowledge Engine.",
      improve:
        "Build a visual interactive knowledge graph UI. Add relationship types (funded-by, competes-with, built-on). Surface emerging clusters automatically.",
    },
    {
      metric: "Writing Quality",
      emoji: "✍️",
      score: 82,
      color: "#ec4899",
      desc: "Copilot-style structured responses with bullet points, clear hierarchy, and 14px legibility. 10-agent Writing Engine polishes every admin output.",
      improve:
        "Add citation linking for all factual claims. Enable auto-summarisation of long sections into TL;DR cards. Improve consistency across all 14 domain descriptions.",
    },
    {
      metric: "Visual Intelligence",
      emoji: "🖼️",
      score: 70,
      color: "#ef4444",
      desc: "384 image slots mapped to technologies. Gemini → DALL-E → Pollinations.ai generation pipeline. Context-scanning Photo Manager checks image–text alignment.",
      improve:
        "Upgrade Gemini Imagen 4 (paid plan) for photorealistic generation. Expand slot coverage from 384 to 1200+. Add automatic image tagging and visual search.",
    },
    {
      metric: "Future Forecasting",
      emoji: "🔭",
      score: 86,
      color: "#818cf8",
      desc: "5-tier timeline system: NOW (0-3yr) → NEAR (5-10yr) → FAR (10-20yr) → SPECULATIVE (20-100yr) → CIVILISATION-SCALE (100-1000yr+). 150+ forecasted tech milestones.",
      improve:
        "Add probability scores per forecast. Connect to prediction markets (Metaculus, Manifold). Backtest past predictions for accuracy scoring.",
    },
  ];

  /* Score data: [The Future 24/7, ChatGPT, Perplexity, Gemini, Claude.ai] */
  const COMPARE_MODELS = [
    "The Future 24/7",
    "ChatGPT",
    "Perplexity",
    "Gemini",
    "Claude.ai",
  ];
  const MODEL_COLORS = [
    "#ef4444",
    "#22c55e",
    "#f59e0b",
    "#818cf8",
    "#0ea5e9",
  ];
  const COMPARE_DATA = {
    "Domain Coverage": [91, 55, 62, 50, 58],
    "Real-Time Updates": [88, 70, 92, 65, 60],
    "Autonomous Operation": [85, 40, 50, 42, 45],
    "Knowledge Depth": [78, 88, 75, 85, 90],
    "Entity Mapping": [74, 60, 65, 58, 70],
    "Writing Quality": [82, 90, 80, 85, 92],
    "Visual Intelligence": [70, 75, 68, 80, 72],
    "Future Forecasting": [86, 65, 58, 68, 70],
  };

  function updateRankingForLevel(level) {
    const lvl = Math.max(1, Number(level) || 1);
    const bonus = Math.min(10, Math.floor((lvl - 1) * 0.8));
    const cards = AI_RANKINGS.map((r) => ({
      ...r,
      score: Math.min(99, r.score + bonus),
    }));
    const tableData = Object.fromEntries(
      Object.entries(COMPARE_DATA).map(([metric, scores]) => {
        const ours = Math.min(99, scores[0] + bonus);
        return [metric, [ours, ...scores.slice(1)]];
      }),
    );
    return { cards, tableData, bonus };
  }

  function drawRankingSection() {
    const grid = document.getElementById("aiRankingGrid");
    if (!grid) return;
    const aiLevel = getAiState().level || 1;
    const ranking = updateRankingForLevel(aiLevel);
    grid.innerHTML = ranking.cards
      .map(
        (r) => `
    <div class="rank-card">
      <div class="rank-card-top">
        <div class="rank-card-label">${r.emoji} &nbsp;${r.metric}</div>
        <div class="rank-card-vs">LVL ${aiLevel} BOOST +${ranking.bonus}</div>
      </div>
      <div class="rank-card-score-row">
        <div class="rank-card-score" style="color:${r.color};">${r.score}<span style="font-size:20px;color:${r.color}88;">/100</span></div>
        <div class="rank-card-score-note">vs top models</div>
      </div>
      <div class="rank-card-bar-wrap"><div class="rank-card-bar" style="width:0%;background:linear-gradient(90deg,${r.color},${r.color}88);" data-w="${r.score}%"></div></div>
      <div class="rank-card-sub">${r.desc}</div>
      <div class="rank-card-improve">
        <strong>TO IMPROVE:</strong> ${r.improve}
      </div>
    </div>`,
      )
      .join("");

    /* Animate bars on scroll */
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.querySelectorAll(".rank-card-bar").forEach((b) => {
              b.style.width = b.dataset.w;
            });
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.3 },
    );
    grid.querySelectorAll(".rank-card").forEach((c) => obs.observe(c));

    /* Comparison table — sorted per row highest → lowest */
    const table = document.getElementById("aiCompareTable");
    if (!table) return;
    table.innerHTML = `
    <thead><tr style="border-bottom:1px solid rgba(255,255,255,.08);">
      <th style="padding:10px 14px;text-align:left;font-size:9px;letter-spacing:.14em;color:var(--muted);text-transform:uppercase;font-weight:700;width:160px;">Metric</th>
      <th style="padding:10px 14px;text-align:left;font-size:9px;letter-spacing:.14em;color:var(--muted);text-transform:uppercase;font-weight:700;" colspan="5">Ranking (highest → lowest)</th>
    </tr></thead>
    <tbody>${Object.entries(ranking.tableData)
      .map(([metric, scores]) => {
        /* Sort models by score descending */
        const ranked = COMPARE_MODELS.map((name, i) => ({
          name,
          score: scores[i],
          color: MODEL_COLORS[i],
        })).sort((a, b) => b.score - a.score);
        return `<tr class="rank-compare-row" style="border-bottom:1px solid rgba(255,255,255,.04);">
        <td style="color:var(--muted);font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:10px 14px;white-space:nowrap;">${metric}</td>
        ${ranked
          .map(
            (m, rank) => `
          <td style="padding:8px 10px;vertical-align:middle;">
            <div style="display:flex;flex-direction:column;gap:3px;min-width:100px;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                <span style="font-size:9px;color:${m.color};font-weight:800;letter-spacing:.04em;">${rank === 0 ? "🏆 " : rank === 1 ? "2. " : rank === 2 ? "3. " : ""}${m.name}</span>
                <span style="font-size:11px;font-weight:900;color:${m.color};">${m.score}</span>
              </div>
              <div style="height:3px;border-radius:2px;background:rgba(255,255,255,.06);overflow:hidden;">
                <div class="rank-mini-fill" style="width:${m.score}%;background:${m.color};height:100%;border-radius:2px;transition:width 1.2s ease;"></div>
              </div>
            </div>
          </td>`,
          )
          .join("")}
      </tr>`;
      })
      .join("")}
    </tbody>`;

    /* Animate comparison bars on scroll */
    const obs2 = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.querySelectorAll(".rank-mini-fill").forEach((b) => {
              const w = b.style.width;
              b.style.width = "0%";
              requestAnimationFrame(() => {
                b.style.width = w;
              });
            });
            obs2.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    table.querySelectorAll("tr").forEach((r) => obs2.observe(r));
  }

  /* ════ ALGALON LEVEL SYSTEM ════ */
  const AI_LEVELS = [
    { lvl: 1, name: "Scout", xpReq: 0, color: "#64748b" },
    { lvl: 2, name: "Analyst", xpReq: 50, color: "#22c55e" },
    { lvl: 3, name: "Researcher", xpReq: 150, color: "#0ea5e9" },
    { lvl: 4, name: "Strategist", xpReq: 300, color: "#818cf8" },
    { lvl: 5, name: "Architect", xpReq: 600, color: "#a855f7" },
    { lvl: 6, name: "Mastermind", xpReq: 1000, color: "#f59e0b" },
    { lvl: 7, name: "Oracle", xpReq: 1600, color: "#ef4444" },
    { lvl: 8, name: "Sentinel", xpReq: 2400, color: "#00c4ff" },
    { lvl: 9, name: "Nexus", xpReq: 3500, color: "#ec4899" },
    { lvl: 10, name: "Singularity", xpReq: 5000, color: "#fbbf24" },
  ];

  const BEYOND_LEVEL_TITLES = [
    "Ascendant",
    "Paragon",
    "Celestial",
    "Eternal",
    "Mythic",
    "Chronicle",
  ];
  const BEYOND_LEVEL_COLORS = [
    "#f97316",
    "#14b8a6",
    "#38bdf8",
    "#a855f7",
    "#ef4444",
    "#22c55e",
  ];

  function getLevelDataByLevel(level) {
    const lvl = Math.max(1, Math.floor(level || 1));
    if (lvl <= AI_LEVELS.length) {
      return AI_LEVELS[lvl - 1];
    }
    const beyond = lvl - AI_LEVELS.length;
    const baseXp = AI_LEVELS[AI_LEVELS.length - 1].xpReq;
    const xpReq = baseXp + beyond * 1000 + (beyond - 1) * beyond * 250;
    const title =
      BEYOND_LEVEL_TITLES[(beyond - 1) % BEYOND_LEVEL_TITLES.length];
    const color =
      BEYOND_LEVEL_COLORS[(beyond - 1) % BEYOND_LEVEL_COLORS.length];
    return { lvl, name: `${title} ${beyond}`, xpReq, color };
  }

  function getLevelDataByXp(xp) {
    const x = Math.max(0, Number(xp) || 0);
    let lvl = 1;
    while (getLevelDataByLevel(lvl + 1).xpReq <= x) lvl++;
    return getLevelDataByLevel(lvl);
  }

  function getAiState() {
    try {
      return JSON.parse(localStorage.getItem("siteAiState") || "{}");
    } catch {
      return {};
    }
  }
  function saveAiState(s) {
    localStorage.setItem("siteAiState", JSON.stringify(s));
  }

  function gainXP(amount) {
    const s = getAiState();
    s.xp = (s.xp || 0) + amount;
    const lvlData = getLevelDataByXp(s.xp);
    const didLvlUp = (s.level || 1) < lvlData.lvl;
    s.level = lvlData.lvl;
    s.levelName = lvlData.name;
    s.levelColor = lvlData.color;
    saveAiState(s);
    updateLevelBadge();
    drawRankingSection();
    if (didLvlUp) flashLevelUp(lvlData);
    syncDomainCounters(liveDomainState.activeDomains);
    return s;
  }

  function updateLevelBadge(livePreviewXp = 0) {
    const s = getAiState();
    const lvl = s.level || 1;
    const lvlData = getLevelDataByLevel(lvl);
    const nextData = getLevelDataByLevel(lvl + 1);
    const baseXp = s.xp || 0;
    const preview = Math.max(0, Number(livePreviewXp) || 0);
    const xp = baseXp + preview;
    const pct = Math.min(
      100,
      Math.max(
        0,
        ((xp - lvlData.xpReq) / (nextData.xpReq - lvlData.xpReq)) * 100,
      ),
    );
    const topStatus = document.getElementById("chatStatusMain");
    if (topStatus) {
      topStatus.textContent = `Algalon LVL ${lvl} (${lvlData.name})`;
      topStatus.title = `${Math.floor(xp)} XP - ${Math.max(0, Math.floor(nextData.xpReq - xp))} XP to LVL ${lvl + 1}`;
    }
    const xpText = document.getElementById("algalonXpText");
    if (xpText) {
      xpText.textContent = `${Math.floor(xp).toLocaleString()} / ${nextData.xpReq.toLocaleString()} XP`;
    }
    const bar = document.getElementById("aiLevelBar");
    if (bar) {
      bar.style.width = pct + "%";
      bar.style.background = lvlData.color;
    }
    const topLevel = document.getElementById("topStripLevel");
    if (topLevel) topLevel.textContent = `LVL ${lvl}`;
    const topXp = document.getElementById("topStripXpBar");
    if (topXp) topXp.style.width = pct + "%";
  }

  /* ════ LIVE DOMAIN ACTIVITY — Real-time updates ════ */
  const liveDomainState = {
    activeDomains: 14,
    updatesHour: 34,
    aiDetections: 9,
    scanDepth: 91,
    coverage: [88, 84, 86, 82, 79, 83, 87, 80, 85, 78, 81, 77, 76, 89, 80],
  };

  function driftValue(current, min, max, step = 1) {
    const delta =
      (Math.random() < 0.5 ? -1 : 1) * Math.ceil(Math.random() * step);
    return Math.max(min, Math.min(max, current + delta));
  }

  function updateLiveDomainActivity() {
    // All tracked domains are always active — no random -1 flicker (it made the
    // counter jump between e.g. 17/18 and 18/18 and look broken/inconsistent).
    const totalDomains = getTrackedDomainTotal();
    liveDomainState.activeDomains = totalDomains;
    liveDomainState.updatesHour = driftValue(
      liveDomainState.updatesHour,
      18,
      72,
      3,
    );
    liveDomainState.aiDetections = driftValue(
      liveDomainState.aiDetections,
      4,
      24,
      2,
    );
    liveDomainState.scanDepth = driftValue(
      liveDomainState.scanDepth,
      82,
      99,
      1,
    );

    const activeDomains = liveDomainState.activeDomains;
    const updatesHour = liveDomainState.updatesHour;
    const aiDetections = liveDomainState.aiDetections;
    const scanDepth = liveDomainState.scanDepth;

    // Update metric boxes
    const el1 = document.getElementById("lda-active-domains");
    const el2 = document.getElementById("lda-updates-hour");
    const el3 = document.getElementById("lda-ai-detections");
    const el4 = document.getElementById("lda-scan-depth");
    if (el1) el1.textContent = activeDomains;
    if (el2) el2.textContent = updatesHour;
    if (el3) el3.textContent = aiDetections;
    if (el4) el4.textContent = scanDepth + "%";
    syncDomainCounters(activeDomains);

    // Update domain coverage bars
    const barContainer = document.getElementById("ldaDomainBars");
    if (barContainer) {
      const domains = [
        "AI",
        "Current",
        "Future",
        "Medical",
        "Energy",
        "Materials",
        "Neuro",
        "Space",
        "Security",
        "Govern",
        "Build",
        "Cosm",
        "Smart",
        "Bio",
        "Agri",
      ];
      const colors = [
        "#0ea5e9",
        "#22c55e",
        "#f59e0b",
        "#ec4899",
        "#06b6d4",
        "#8b5cf6",
        "#10b981",
        "#f97316",
        "#6366f1",
        "#14b8a6",
        "#d97706",
        "#a855f7",
        "#0891b2",
        "#22c55e",
        "#84cc16",
      ];
      barContainer.innerHTML = domains
        .map((d, i) => {
          liveDomainState.coverage[i] = driftValue(
            liveDomainState.coverage[i] ?? 80,
            68,
            97,
            2,
          );
          const coverage = liveDomainState.coverage[i];
          return `<div style="text-align:center;">
        <div style="width:100%;height:32px;background:rgba(255,255,255,.05);border-radius:4px;overflow:hidden;margin-bottom:4px;">
          <div style="width:${coverage}%;height:100%;background:${colors[i]};transition:width .3s;"></div>
        </div>
        <div style="font-size:9px;color:var(--muted);">${d} ${coverage}%</div>
      </div>`;
        })
        .join("");
    }

    // Rotate activity feed
    const feedEl = document.getElementById("ldaActivityFeed");
    if (feedEl && Math.random() > 0.7) {
      const activities = [
        {
          icon: "●",
          color: "#0ea5e9",
          title: "Full Site Scan Started",
          desc: `Scanning all ${totalDomains} domains for updates`,
          time: "Now",
        },
        {
          icon: "✓",
          color: "#22c55e",
          title: "New Update: Breakthrough AI Model",
          desc: "Classified under AI → Foundation Models",
          time: "30s ago",
        },
        {
          icon: "⚠",
          color: "#a855f7",
          title: "Missing Content Detected",
          desc: "Energy domain needs 3 new companies",
          time: "2m ago",
        },
        {
          icon: "🔍",
          color: "#f59e0b",
          title: "AI Analysis Complete",
          desc: "Found 12 emerging technologies",
          time: "5m ago",
        },
        {
          icon: "⚡",
          color: "#06b6d4",
          title: "System Optimization",
          desc: "Reduced page load time by 0.3s",
          time: "8m ago",
        },
      ];
      const randActivity =
        activities[Math.floor(Math.random() * activities.length)];
      const item = document.createElement("div");
      item.style.cssText = `display:flex;gap:12px;align-items:flex-start;padding:10px;border-left:2px solid ${randActivity.color}33;animation:slideIn .3s;`;
      item.innerHTML = `
      <span style="font-size:12px;color:${randActivity.color};">${randActivity.icon}</span>
      <div>
        <div style="font-size:12px;font-weight:600;color:#e2e8f0;">${randActivity.title}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:2px;">${randActivity.desc}</div>
        <div style="font-size:9px;color:#475569;margin-top:4px;">${randActivity.time}</div>
      </div>
    `;
      feedEl.insertBefore(item, feedEl.firstChild);
      if (feedEl.children.length > 5) feedEl.removeChild(feedEl.lastChild);
    }
  }

  function flashLevelUp(lvlData) {
    const el = document.getElementById("chatStatusMain");
    if (!el) return;
    el.animate(
      [
        { boxShadow: `0 0 0px ${lvlData.color}`, transform: "scale(1)" },
        {
          boxShadow: `0 0 18px ${lvlData.color}`,
          transform: "scale(1.12)",
        },
        { boxShadow: `0 0 0px ${lvlData.color}`, transform: "scale(1)" },
      ],
      { duration: 900, iterations: 2 },
    );
    addFloatMsg(
      `Level up! You are now LVL ${lvlData.lvl} — ${lvlData.name}. The AI grows stronger with every interaction.`,
      "ai",
    );
  }

  /* ════ GLOBAL CYCLE WATCHER — live chat feed + XP ════ */
  const STEP_LABELS = {
    "self-improve": {
      icon: "🧬",
      verb: "Self-Improving",
      full: "Scanning all 14 domains for content gaps and applying improvements…",
    },
    knowledge: {
      icon: "🕸️",
      verb: "Mapping Knowledge",
      full: "Scanning entity graph, detecting cross-domain links and gaps…",
    },
    evolve: {
      icon: "🔭",
      verb: "Evolving Platform",
      full: "Running architectural analysis and proposing structural upgrades…",
    },
  };

  let _watcherLastStep = null;
  let _watcherLastStepTs = null;
  let _watcherLastCycleCount = -1;
  let _watcherBooted = false;
  let _cycleWatcherInterval = null;
  let _watcherLiveXpPreview = 0;
  let _runtimeLiveXpPreview = 0;
  let _runtimeXpInterval = null;
  const FORCE_FIXED_LIVE_STATUS = true;

  function getTotalLivePreviewXp() {
    return (
      Math.max(0, _watcherLiveXpPreview) +
      Math.max(0, _runtimeLiveXpPreview)
    );
  }

  function setLiveStatus(text, color = "#475569", pulse = false) {
    const dot = document.getElementById("aiLiveStatusDot");
    const span = document.getElementById("aiLiveStatusText");
    if (FORCE_FIXED_LIVE_STATUS) {
      if (dot) {
        dot.style.background = "#22c55e";
        dot.style.animation = "none";
      }
      if (span) span.textContent = "LIVE";
      return;
    }
    if (dot) {
      dot.style.background = color;
      dot.style.animation = pulse ? "livepulse 1.4s infinite" : "none";
    }
    if (span) span.textContent = text;
  }

  async function cycleWatcherTick() {
    try {
      const res = await fetch("/api/cycle-status");
      if (!res.ok) return;
      const s = await res.json();

      /* ── First boot: seed XP + baseline ── */
      if (!_watcherBooted) {
        _watcherBooted = true;
        _watcherLastCycleCount = s.cycleCount;
        if (s.cycleCount > 0) {
          const st = getAiState();
          if (!st.xpSeeded) {
            gainXP(s.cycleCount * 8);
            st.xpSeeded = true;
            saveAiState(st);
          }
        }
        if (s.running && !s.paused)
          setLiveStatus("Cycle active", "#22c55e", true);
        return;
      }

      /* ── Step started ── */
      if (s.currentStep && s.currentStep !== _watcherLastStep) {
        _watcherLastStep = s.currentStep;
        _watcherLiveXpPreview = 0;
        const info = STEP_LABELS[s.currentStep] || {
          icon: "⚡",
          verb: s.currentStep,
          full: "Running…",
        };
        setLiveStatus(`${info.icon} ${info.verb}…`, "#00c8ff", true);
        /* Cycle telemetry is admin-only — keep the public chat clean */
        if (document.body.classList.contains("admin-mode"))
          addFloatMsg(
            `${info.icon} Currently working on: ${info.verb.toUpperCase()}\n\n• ${info.full}\n• Cycle ${s.cycleCount + 1} — Mode: ${(s.currentMode || "sequential").toUpperCase()}`,
            "ai",
          );
      }

      /* ── Step finished ── */
      if (!s.currentStep && _watcherLastStep) {
        const latest = s.history && s.history[0];
        if (
          latest &&
          latest.step === _watcherLastStep &&
          latest.ts !== _watcherLastStepTs
        ) {
          _watcherLastStepTs = latest.ts;
          _watcherLiveXpPreview = 0;
          const info = STEP_LABELS[_watcherLastStep] || {
            icon: "✓",
            verb: _watcherLastStep,
          };
          const actTxt =
            latest.actions > 0
              ? `${latest.actions} improvement${latest.actions === 1 ? "" : "s"} applied`
              : "analysis complete — no changes needed";
          const summary = (latest.summary || "").trim();
          const bulletSummary = summary
            ? "\n\n• " + summary.slice(0, 180).replace(/\n+/g, "\n• ")
            : "";
          if (document.body.classList.contains("admin-mode"))
            addFloatMsg(
              `${info.icon} ${info.verb} finished — ${actTxt}${bulletSummary}`,
              "ai",
            );
          gainXP(latest.actions > 0 ? 12 : 3);
        }
        _watcherLastStep = null;
      }

      /* ── Cycle completed ── */
      if (
        s.cycleCount > _watcherLastCycleCount &&
        _watcherLastCycleCount >= 0
      ) {
        const gained = s.cycleCount - _watcherLastCycleCount;
        _watcherLastCycleCount = s.cycleCount;
        gainXP(10 * gained);
        const mode = (s.currentMode || "sequential").toUpperCase();
        if (document.body.classList.contains("admin-mode"))
          addFloatMsg(
            `♾️ Cycle ${s.cycleCount} complete!\n\n• Mode: ${mode}\n• Total steps run: ${s.stepCount}\n• XP gained this cycle: +10\n• Next cycle starting in 30s…`,
            "ai",
          );
      } else if (_watcherLastCycleCount < 0) {
        _watcherLastCycleCount = s.cycleCount;
      }

      /* ── Live status line ── */
      if (s.currentStep) {
        const info = STEP_LABELS[s.currentStep] || {
          icon: "⚡",
          verb: s.currentStep,
        };
        setLiveStatus(`${info.icon} ${info.verb}…`, "#00c8ff", true);
        _watcherLiveXpPreview = Math.min(12, _watcherLiveXpPreview + 1.1);
        updateLevelBadge(getTotalLivePreviewXp());
      } else if (s.running && !s.paused) {
        setLiveStatus(
          "● Cycle active — waiting next step",
          "#22c55e",
          false,
        );
        if (_watcherLiveXpPreview > 0) {
          _watcherLiveXpPreview = 0;
          updateLevelBadge(getTotalLivePreviewXp());
        }
      } else {
        setLiveStatus("Idle", "#475569", false);
        if (_watcherLiveXpPreview > 0) {
          _watcherLiveXpPreview = 0;
          updateLevelBadge(getTotalLivePreviewXp());
        }
      }
    } catch {
      /* server offline, ignore */
    }
  }

  function startCycleWatcher() {
    if (_cycleWatcherInterval) return;
    _cycleWatcherInterval = setInterval(cycleWatcherTick, 4000);
    cycleWatcherTick(); /* immediate first tick */
  }

  async function runtimeXpTick() {
    try {
      const runtime = await fetch("/api/chat-runtime-status").then((r) =>
        r.json(),
      );
      const gpu = Number(runtime?.gpu?.livePercent);
      const cpu = Number(runtime?.cpu?.livePercent);
      const gpuNorm = Number.isFinite(gpu)
        ? Math.max(0, Math.min(100, gpu))
        : 0;
      const cpuNorm = Number.isFinite(cpu)
        ? Math.max(0, Math.min(100, cpu))
        : 0;
      const load = Math.max(gpuNorm, cpuNorm * 0.7);
      const hasLiveRuntime = runtime?.liveLocal?.online === true;
      const targetPreview =
        load <= 1 ? (hasLiveRuntime ? 0.8 : 0) : Math.min(8, load / 12);
      _runtimeLiveXpPreview =
        _runtimeLiveXpPreview * 0.55 + targetPreview * 0.45;
      if (_runtimeLiveXpPreview < 0.2) _runtimeLiveXpPreview = 0;
      updateLevelBadge(getTotalLivePreviewXp());
    } catch {
      _runtimeLiveXpPreview = 0;
      updateLevelBadge(getTotalLivePreviewXp());
    }
  }

  function startRuntimeXpFeed() {
    if (_runtimeXpInterval) return;
    _runtimeXpInterval = setInterval(runtimeXpTick, 2500);
    runtimeXpTick();
    setInterval(evolutionXpTick, 30000);
    evolutionXpTick();
  }

  /* Real evolution XP: every site edit ACCEPTED by the edit gate awards 5 XP.
     Leveling now tracks improvements that actually landed, not just load. */
  async function evolutionXpTick() {
    try {
      const s = await fetch("/api/evolution-stats").then((r) => r.json());
      if (!Number.isFinite(s.accepted)) return;
      const seen = Number(localStorage.getItem("evoAcceptedSeen") || "0");
      if (s.accepted > seen) {
        gainXP((s.accepted - seen) * 5);
        localStorage.setItem("evoAcceptedSeen", String(s.accepted));
      } else if (s.accepted < seen) {
        localStorage.setItem("evoAcceptedSeen", String(s.accepted));
      }
    } catch {}
  }

  function syncChatWindowTitle() {
    const titleEl = document.getElementById("floatChatTitle");
    if (!titleEl) return;
    titleEl.textContent =
      floatMode === "admin" ? "Admin Chat" : "AI Chat";
  }

  function extractUrlFromBackground(bg) {
    if (!bg) return "";
    const m = bg.match(/url\(["']?(.*?)["']?\)/i);
    return m ? m[1] : "";
  }

  function buildTechDetailUrl({ title, domain, summary, image, itemId }) {
    const p = new URLSearchParams();
    p.set("title", title || "Technology");
    p.set("domain", domain || "Technology");
    p.set("summary", (summary || "").slice(0, 1200));
    p.set("image", image || "");
    p.set("id", itemId || "tech-" + Date.now());
    return `/tech-detail.html?${p.toString()}`;
  }

  function deriveDomainFromElement(el) {
    const sec = el.closest('section[id^="domain-"]');
    if (!sec) return "Technology";
    const map = {
      "domain-ai": "AI",
      "domain-cur": "Current Tech",
      "domain-fut": "Future Tech",
      "domain-med": "Medicine",
      "domain-nrg": "Energy",
      "domain-mat": "Materials",
      "domain-neu": "Neurotech",
      "domain-spc": "Space",
      "domain-sec": "Security",
      "domain-gov": "Governance",
      "domain-bld": "Construction",
      "domain-3dp": "3D Printing",
      "domain-robotics": "Robotics",
      "domain-auto-jobs": "Automation Jobs",
      "domain-cos": "Cosmetics",
      "domain-smt": "Smart Systems",
      "domain-syn": "Synthetic Biology",
    };
    return map[sec.id] || "Technology";
  }

  function ensureImageFirstAndTitleLinks() {
    // Image first for matrix cards
    document.querySelectorAll(".pc").forEach((card, idx) => {
      const title =
        card.querySelector(".pc-title")?.textContent?.trim() ||
        `Technology ${idx + 1}`;
      if (!card.querySelector(".card-img-top")) {
        const imgTop = document.createElement("div");
        imgTop.className = "card-img-top";
        const hue = hashString(title) % 360;
        imgTop.style.backgroundImage = `linear-gradient(180deg,rgba(6,9,26,.15),rgba(6,9,26,.55)),radial-gradient(circle at 20% 25%,hsla(${hue},85%,58%,.34),transparent 48%),radial-gradient(circle at 80% 78%,hsla(${(hue + 72) % 360},80%,56%,.28),transparent 54%),linear-gradient(135deg,#0b1328,#121f37)`;
        const top = card.querySelector(".pc-top");
        if (top) card.insertBefore(imgTop, top);
        else card.prepend(imgTop);
      }
    });

    // Every visible technology title opens full detail page
    document.querySelectorAll(".pc-title").forEach((titleEl, idx) => {
      if (titleEl.dataset.detailBound === "1") return;
      titleEl.dataset.detailBound = "1";
      titleEl.classList.add("tech-link");
      titleEl.title = "Open full technology page";
      titleEl.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const card = titleEl.closest(".pc");
        const title = titleEl.textContent.trim();
        const summary =
          card?.querySelector(".pc-desc")?.textContent?.trim() || "";
        const image = card
          ? extractUrlFromBackground(
              card.querySelector(".card-img-top")?.style?.backgroundImage ||
                "",
            )
          : "";
        const domain = deriveDomainFromElement(titleEl);
        const itemId = `pc-${idx}-${title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 60)}`;
        window.location.href = buildTechDetailUrl({
          title,
          domain,
          summary,
          image,
          itemId,
        });
      });
    });

    const extraSelectors = [".bi-name", ".co-name", ".wi-card-title"];
    document
      .querySelectorAll(extraSelectors.join(","))
      .forEach((titleEl, idx) => {
        if (titleEl.dataset.detailBound === "1") return;
        titleEl.dataset.detailBound = "1";
        titleEl.style.cursor = "pointer";
        titleEl.title = "Open full technology page";
        titleEl.addEventListener("click", (e) => {
          if (e.target.closest("a")) return;
          e.preventDefault();
          e.stopPropagation();
          const title = titleEl.textContent.trim();
          const parentCard = titleEl.closest(
            ".bi, .co-card, .wi-card, .pc",
          );
          const summary =
            parentCard
              ?.querySelector(
                ".bi-cos, .co-what, .wi-card-summary, .pc-desc",
              )
              ?.textContent?.trim() || "";
          const image =
            extractUrlFromBackground(
              parentCard?.querySelector(".card-img-top")?.style
                ?.backgroundImage || "",
            ) || "";
          const domain = deriveDomainFromElement(titleEl);
          const itemId = `xt-${idx}-${title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .slice(0, 60)}`;
          window.location.href = buildTechDetailUrl({
            title,
            domain,
            summary,
            image,
            itemId,
          });
        });
      });
  }

  /* ════ INTERNET LOCK — Layer 1 Safety System ════ */
  let internetLockEnabled = true; /* Default: DENY */

  function toggleInternetLock() {
    internetLockEnabled = !internetLockEnabled;
    localStorage.setItem(
      "ariaInternetLock",
      internetLockEnabled ? "DENY" : "ALLOW",
    );
    updateInternetLockUI();
  }

  function resetInternetLock() {
    internetLockEnabled = true;
    localStorage.setItem("ariaInternetLock", "DENY");
    updateInternetLockUI();
  }

  function updateInternetLockUI() {
    const statusEl = document.getElementById("internetLockStatus");
    const btnEl = document.getElementById("internetLockToggleBtn");
    const infoEl = document.getElementById("internetLockInfo");

    if (internetLockEnabled) {
      /* DENY state */
      statusEl.textContent = "DENY";
      statusEl.style.color = "#ef4444";
      btnEl.textContent = "Enable Access";
      btnEl.style.background = "rgba(0,229,255,.08)";
      btnEl.style.borderColor = "rgba(0,229,255,.3)";
      btnEl.style.color = "#00e5ff";
      infoEl.innerHTML =
        'Status: Internet access is <b>LOCKED</b><br/>Type <code style="background:rgba(0,0,0,.3);padding:1px 4px;border-radius:2px;">INTERNET: ALLOW</code> to enable';
    } else {
      /* ALLOW state */
      statusEl.textContent = "ALLOW";
      statusEl.style.color = "#22c55e";
      btnEl.textContent = "Disable Access";
      btnEl.style.background = "rgba(34,197,94,.12)";
      btnEl.style.borderColor = "rgba(34,197,94,.3)";
      btnEl.style.color = "#4ade80";
      infoEl.innerHTML =
        'Status: Internet access is <b>ENABLED</b><br/>Type <code style="background:rgba(0,0,0,.3);padding:1px 4px;border-radius:2px;">INTERNET: DENY</code> to disable';
    }
  }

  function initInternetLock() {
    const saved = localStorage.getItem("ariaInternetLock");
    if (saved === "ALLOW") {
      internetLockEnabled = false;
    } else {
      internetLockEnabled = true;
    }
    updateInternetLockUI();
  }

  let siteRevisionSeen = null;
  let siteRevisionPoller = null;
  let siteRevisionWatchAvailable = true;

  async function checkClientRevision() {
    if (!siteRevisionWatchAvailable) return;
    try {
      const res = await fetch("/api/client-revision", {
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 404) {
          siteRevisionWatchAvailable = false;
          if (siteRevisionPoller) {
            clearInterval(siteRevisionPoller);
            siteRevisionPoller = null;
          }
        }
        return;
      }
      const data = await res.json();
      const rev = String(data?.revision || "0");
      if (!siteRevisionSeen) {
        siteRevisionSeen = rev;
        return;
      }
      if (rev !== siteRevisionSeen) {
        siteRevisionSeen = rev;
        if (
          document.activeElement &&
          (document.activeElement.tagName === "INPUT" ||
            document.activeElement.tagName === "TEXTAREA")
        ) {
          setTimeout(() => window.location.reload(), 900);
        } else {
          window.location.reload();
        }
      }
    } catch (_) {
      /* Ignore transient errors and keep watcher running for recoverable failures */
    }
  }

  function startClientRevisionWatcher() {
    if (siteRevisionPoller) clearInterval(siteRevisionPoller);
    checkClientRevision();
    siteRevisionPoller = setInterval(checkClientRevision, 5000);
  }

  function applyAccessibilityHardening() {
    document.querySelectorAll(".dg-card").forEach((card) => {
      if (!card.hasAttribute("tabindex"))
        card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.setAttribute(
        "aria-expanded",
        card.dataset.open === "true" ? "true" : "false",
      );
      if (card.dataset.kbdBound === "1") return;
      card.dataset.kbdBound = "1";
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleBranch(card);
        }
      });
    });
  }

  function applyImageAltFallbacks() {
    document.querySelectorAll("img").forEach((img, idx) => {
      const current = img.getAttribute("alt");
      if (current && current.trim()) return;
      const contextTitle = img
        .closest(".pc, .bi, .co-card, .wi-card, .pm-slot")
        ?.querySelector(
          ".pc-title, .bi-name, .co-name, .wi-card-title, .pm-slot-name",
        )
        ?.textContent?.trim();
      img.setAttribute(
        "alt",
        contextTitle || `Technology image ${idx + 1}`,
      );
    });
  }

  async function postRuntimeAccessibilityReport() {
    try {
      const clickable = document.querySelectorAll(
        "[onclick], .dg-card, .pc, .pm-slot-btn",
      ).length;
      const keyboardReady = document.querySelectorAll(
        "[onkeydown], [tabindex], button, a[href], input, textarea, select",
      ).length;
      const images = Array.from(document.querySelectorAll("img"));
      const missingAlt = images.filter(
        (img) => !(img.getAttribute("alt") || "").trim(),
      ).length;
      const payload = {
        page: location.pathname,
        title: document.title,
        clickableElements: clickable,
        keyboardReadyElements: keyboardReady,
        images: images.length,
        missingAlt,
        timestamp: new Date().toISOString(),
      };
      await fetch("/api/runtime-accessibility-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (_) {}
  }

  /* ════ Init on page load ════ */
  document.addEventListener("DOMContentLoaded", () => {
    initInternetLock();
    syncDomainCounters();
    drawSchemaGrid();
    loadFeed();
    drawRankingSection();
    updateLevelBadge();
    startCycleWatcher();
    startRuntimeXpFeed();
    startClientRevisionWatcher();
    injectProbabilityBadges();
    initKnowledgeGraph();
    initAlgalonCanvas();
    /* Load and apply all slot images on page load */
    loadAndApplyImages();
    /* Always start in public chat mode and require fresh admin auth */
    adminUnlocked = false;
    try {
      sessionStorage.removeItem("adminUnlocked");
    } catch {}
    /* Apply guide mode defaults */
    setFloatMode("guide");
    syncChatWindowTitle();
    refreshChatRouteUI();
    updateLiveTalkButtonUI();
    /* Start live domain activity updates */
    updateLiveDomainActivity();
    setInterval(updateLiveDomainActivity, 3000);
    /* Embedded live charts with periodic refresh */
    renderDomainCharts();
    setInterval(renderDomainCharts, 15000);
    /* Global rule: image first + titles open full detail page */
    ensureImageFirstAndTitleLinks();
    applyAccessibilityHardening();
    applyImageAltFallbacks();
    setTimeout(ensureImageFirstAndTitleLinks, 1200);
    setTimeout(applyImageAltFallbacks, 1200);
    setTimeout(postRuntimeAccessibilityReport, 1500);
  });

  /* ════ ALGALON THE OBSERVER — canvas constellation figure ════ */
  function initAlgalonCanvas() {
    const canvas = document.getElementById("algalonCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const nodes = Array.from({ length: 24 }, (_, i) => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.42,
      vy: (Math.random() - 0.5) * 0.42,
      r: 1.1 + Math.random() * 1.7,
      phase: Math.random() * Math.PI * 2,
      g: i % 3,
    }));

    let tick = 0;

    function draw() {
      tick += 1;
      const active = document
        .getElementById("algalonOrb")
        ?.classList.contains("active");
      const speedFactor = active ? 1.28 : 1;
      const edgeMax = active ? 40 : 22;

      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(
        0,
        active ? "rgba(2,10,28,0.90)" : "rgba(2,6,23,0.84)",
      );
      bg.addColorStop(
        1,
        active ? "rgba(5,18,36,0.95)" : "rgba(5,12,32,0.90)",
      );
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      for (const n of nodes) {
        n.x += n.vx * speedFactor;
        n.y += n.vy * speedFactor;
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
          if (d > edgeMax) continue;

          const alphaScale = active ? 0.55 : 0.34;
          const alpha =
            (1 - d / edgeMax) *
            (a.g === b.g ? alphaScale : alphaScale * 0.54);
          ctx.strokeStyle =
            a.g === b.g
              ? `rgba(56,189,248,${alpha})`
              : `rgba(129,140,248,${alpha})`;
          ctx.lineWidth =
            a.g === b.g ? (active ? 1.3 : 1) : active ? 0.95 : 0.75;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        const pulse = 0.58 + 0.42 * Math.sin(tick / 18 + n.phase);
        const color =
          n.g === 0 ? "#38bdf8" : n.g === 1 ? "#818cf8" : "#22d3ee";
        ctx.fillStyle = color;

        ctx.globalAlpha = (active ? 0.28 : 0.18) * pulse;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (active ? 4.9 : 3.8), 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = active ? 0.97 : 0.82;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    }

    draw();
  }

  window.PHASE_PROB = {
    now: { base: 82, range: 14, color: "#22c55e", label: "LIKELIHOOD" },
    near: { base: 58, range: 24, color: "#38bdf8", label: "PROBABILITY" },
    far: { base: 34, range: 26, color: "#a78bfa", label: "PROBABILITY" },
    spec: { base: 12, range: 18, color: "#f59e0b", label: "SPECULATIVE" },
    civ: { base: 5, range: 8, color: "#ef4444", label: "LONG HORIZON" },
  };

  function injectProbabilityBadges() {
    document.querySelectorAll(".pc[data-s]").forEach((card, i) => {
      if (card.querySelector(".prob-badge")) return;
      const phase = card.dataset.s;
      const cfg = (window.PHASE_PROB || {})[phase];
      if (!cfg) return;
      const pct =
        cfg.base + Math.floor((Math.sin(i * 2.7) * 0.5 + 0.5) * cfg.range);
      const badge = document.createElement("div");
      badge.className = "prob-badge";
      badge.style.cssText = `display:inline-flex;align-items:center;gap:4px;font-size:9px;font-weight:800;letter-spacing:.06em;color:${cfg.color};background:${cfg.color}12;border:1px solid ${cfg.color}28;border-radius:4px;padding:2px 6px;margin-top:4px;width:fit-content;`;
      badge.innerHTML = `<span style="font-size:8px;">◈</span> ${pct}% ${cfg.label}`;
      card.appendChild(badge);
      /* TL;DR button */
      const tlBtn = document.createElement("button");
      tlBtn.style.cssText = `font-size:9px;padding:2px 7px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:4px;color:#475569;cursor:pointer;margin-top:3px;font-family:inherit;display:block;`;
      tlBtn.textContent = "📋 TL;DR";
      const tlDiv = document.createElement("div");
      tlDiv.style.cssText =
        "display:none;font-size:10px;color:#94a3b8;margin-top:6px;padding:6px 8px;background:rgba(0,0,0,.25);border-radius:6px;line-height:1.5;border-left:2px solid " +
        cfg.color +
        ";";
      tlBtn.onclick = async () => {
        if (tlDiv.style.display !== "none") {
          tlDiv.style.display = "none";
          tlBtn.textContent = "📋 TL;DR";
          return;
        }
        if (tlDiv.dataset.loaded) {
          tlDiv.style.display = "block";
          tlBtn.textContent = "▲ Close";
          return;
        }
        tlBtn.textContent = "⏳ Loading…";
        tlBtn.disabled = true;
        const title = card.querySelector(".pc-title")?.textContent || "";
        const desc = card.querySelector(".pc-desc")?.textContent || "";
        try {
          const r = await fetch("/api/tldr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, summary: desc, domain: phase }),
          });
          const d = await r.json();
          tlDiv.textContent = d.tldr || "No summary available.";
          tlDiv.dataset.loaded = "1";
          tlDiv.style.display = "block";
          tlBtn.textContent = "▲ Close";
        } catch {
          tlDiv.textContent = "Could not load TL;DR.";
          tlDiv.style.display = "block";
        }
        tlBtn.disabled = false;
      };
      card.appendChild(tlBtn);
      card.appendChild(tlDiv);
    });
  }

  /* ════ FEED TABS ════ */
  let currentFeedTab = "news";
  let scienceFeedCache = null;

  function switchFeedTab(tab) {
    currentFeedTab = tab;
    const tabs = {
      news: "feedTabNews",
      science: "feedTabScience",
      preprints: "feedTabPreprints",
      trials: "feedTabTrials",
    };
    Object.entries(tabs).forEach(([t, id]) => {
      const el = document.getElementById(id);
      if (!el) return;
      const active = t === tab;
      const color =
        {
          news: "#00c8ff",
          science: "#22c55e",
          preprints: "#a855f7",
          trials: "#0ea5e9",
        }[t] || "#00c8ff";
      el.style.color = active ? color : "var(--muted)";
      el.style.borderBottomColor = active ? color : "transparent";
    });
    const newsGrid = document.getElementById("feedGrid");
    const sciGrid = document.getElementById("scienceGrid");
    if (tab === "news") {
      if (newsGrid) newsGrid.style.display = "";
      if (sciGrid) sciGrid.style.display = "none";
    } else {
      if (newsGrid) newsGrid.style.display = "none";
      if (sciGrid) sciGrid.style.display = "";
      loadScienceFeed(tab);
    }
  }

  async function loadScienceFeed(type) {
    const sciGrid = document.getElementById("scienceGrid");
    if (!sciGrid) return;
    sciGrid.innerHTML = `<div class="feed-empty">Fetching ${type === "science" ? "PubMed science articles" : type === "preprints" ? "arXiv preprints" : "ClinicalTrials.gov studies"}…</div>`;
    const queryMap = {
      science: "artificial intelligence medicine cancer neuroscience",
      preprints: "machine learning quantum computing",
      trials: "immunotherapy cancer RNA therapy",
    };
    try {
      const res = await fetch(
        "/api/science-feed?q=" +
          encodeURIComponent(queryMap[type] || "technology"),
      );
      const data = await res.json();
      const items = (data.items || []).filter((it) => {
        if (type === "science") return it.type === "science";
        if (type === "preprints") return it.type === "preprint";
        if (type === "trials") return it.type === "trial";
        return true;
      });
      if (!items.length) {
        sciGrid.innerHTML =
          '<div class="feed-empty">No results found — try a different feed tab.</div>';
        return;
      }
      const typeIcons = { science: "🔬", preprint: "📄", trial: "⚕️" };
      sciGrid.innerHTML = items
        .map((it) => {
          const accent = it.color || "#00c4ff";
          const icon = typeIcons[it.type] || "📡";
          const localThumb = makeLocalThumb(
            it.title || "Science Research",
            accent,
          );
          const primaryThumb = ENABLE_REMOTE_THUMBS
            ? it.thumb || localThumb
            : localThumb;
          return `<div class="feed-card" style="display:flex;align-items:flex-start;padding:12px 14px;overflow:hidden;gap:12px;">
        <img src="${primaryThumb}" style="width:56px;height:56px;border-radius:8px;object-fit:cover;flex-shrink:0;" alt="${(it.title || "Science research image").replace(/"/g, "&quot;")}" onerror="this.onerror=null;this.src='${localThumb}'">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="font-size:10px;color:${accent};font-weight:800;letter-spacing:.06em;">${icon} ${it.source}</span>
            ${it.badge ? `<span style="font-size:9px;padding:1px 5px;background:${accent}14;border:1px solid ${accent}30;border-radius:3px;color:${accent}cc;">${it.badge.slice(0, 25)}</span>` : ""}
          </div>
          <a href="${it.link || "#"}" target="_blank" rel="noopener" style="font-size:13px;font-weight:600;color:#e2e8f0;text-decoration:none;display:block;line-height:1.4;margin-bottom:4px;">${it.title}</a>
          ${it.summary ? `<p style="font-size:11px;color:var(--muted);line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${it.summary}</p>` : ""}
        </div>
      </div>`;
        })
        .join("");
    } catch (e) {
      sciGrid.innerHTML = `<div class="feed-empty">Science feed error: ${e.message}</div>`;
    }
  }

  /* ════ KNOWLEDGE GRAPH ════ */
  const KG_DOMAIN_NODES = [
    {
      id: "ai",
      label: "AI",
      color: "#00c8ff",
      x: 0,
      y: 0,
      size: 20,
      connections: [
        "med",
        "nrg",
        "spc",
        "neu",
        "sec",
        "smt",
        "syn",
        "mat",
        "fut",
      ],
    },
    {
      id: "med",
      label: "Medicine",
      color: "#22c55e",
      x: 0,
      y: 0,
      size: 16,
      connections: ["ai", "syn", "neu", "cos", "fut"],
    },
    {
      id: "nrg",
      label: "Energy",
      color: "#f59e0b",
      x: 0,
      y: 0,
      size: 15,
      connections: ["ai", "mat", "spc", "bld", "smt"],
    },
    {
      id: "spc",
      label: "Space",
      color: "#818cf8",
      x: 0,
      y: 0,
      size: 15,
      connections: ["ai", "nrg", "mat", "fut", "neu"],
    },
    {
      id: "mat",
      label: "Materials",
      color: "#ec4899",
      x: 0,
      y: 0,
      size: 14,
      connections: ["ai", "nrg", "spc", "med", "bld", "syn"],
    },
    {
      id: "neu",
      label: "Neurotech",
      color: "#a855f7",
      x: 0,
      y: 0,
      size: 13,
      connections: ["ai", "med", "sec", "smt", "cos"],
    },
    {
      id: "syn",
      label: "Syn Bio",
      color: "#14b8a6",
      x: 0,
      y: 0,
      size: 13,
      connections: ["ai", "med", "mat", "cos", "fut"],
    },
    {
      id: "sec",
      label: "Cyber",
      color: "#ef4444",
      x: 0,
      y: 0,
      size: 12,
      connections: ["ai", "gov", "smt", "bld"],
    },
    {
      id: "gov",
      label: "Govern",
      color: "#64748b",
      x: 0,
      y: 0,
      size: 11,
      connections: ["sec", "ai", "smt", "fut"],
    },
    {
      id: "smt",
      label: "Smart Sys",
      color: "#0ea5e9",
      x: 0,
      y: 0,
      size: 13,
      connections: ["ai", "nrg", "bld", "sec", "neu"],
    },
    {
      id: "bld",
      label: "Construct",
      color: "#d97706",
      x: 0,
      y: 0,
      size: 11,
      connections: ["mat", "smt", "nrg", "gov"],
    },
    {
      id: "cos",
      label: "Cosmetics",
      color: "#db2777",
      x: 0,
      y: 0,
      size: 11,
      connections: ["med", "syn", "ai", "neu"],
    },
    {
      id: "fut",
      label: "Future",
      color: "#fbbf24",
      x: 0,
      y: 0,
      size: 14,
      connections: ["ai", "spc", "syn", "gov", "neu"],
    },
    {
      id: "cur",
      label: "Cur Tech",
      color: "#06b6d4",
      x: 0,
      y: 0,
      size: 12,
      connections: ["ai", "sec", "smt", "fut"],
    },
  ];

  let kgAnimFrame = null;
  let kgDragNode = null;
  let kgSelected = null;
  let kgExtraLinks = [];

  function initKnowledgeGraph() {
    const canvas = document.getElementById("kgCanvas");
    if (!canvas) return;
    const W = canvas.offsetWidth || 900;
    const H = 460;
    canvas.width = W;
    canvas.height = H;
    /* Circle layout */
    const cx = W / 2,
      cy = H / 2,
      r = Math.min(W, H) * 0.38;
    const n = KG_DOMAIN_NODES.length;
    KG_DOMAIN_NODES.forEach((node, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      node.x = cx + r * Math.cos(angle);
      node.y = cy + r * Math.sin(angle);
      node.vx = 0;
      node.vy = 0;
    });
    /* Load any stored cross-domain links */
    fetch("/api/cross-domain")
      .then((r) => r.json())
      .then((d) => {
        kgExtraLinks = d.crossDomainLinks || [];
        renderKG();
      })
      .catch(() => renderKG());

    /* Mouse events */
    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);
      if (kgDragNode) {
        kgDragNode.x = mx;
        kgDragNode.y = my;
        return;
      }
      const hover = KG_DOMAIN_NODES.find(
        (n) => Math.hypot(n.x - mx, n.y - my) < n.size + 4,
      );
      canvas.style.cursor = hover ? "pointer" : "grab";
      if (hover) {
        document.getElementById("kgStatus").textContent =
          `${hover.label} — connects to: ${hover.connections.map((c) => KG_DOMAIN_NODES.find((n) => n.id === c)?.label || c).join(", ")}`;
      }
    };
    canvas.onmousedown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);
      kgDragNode = KG_DOMAIN_NODES.find(
        (n) => Math.hypot(n.x - mx, n.y - my) < n.size + 6,
      );
    };
    canvas.onmouseup = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);
      const clicked = KG_DOMAIN_NODES.find(
        (n) => Math.hypot(n.x - mx, n.y - my) < n.size + 6,
      );
      if (clicked && !kgDragNode?.dragged) {
        kgSelected = kgSelected?.id === clicked.id ? null : clicked;
        showKGNodeDetail(kgSelected);
      }
      kgDragNode = null;
    };
    canvas.ontouchstart = (e) => {
      e.preventDefault();
      canvas.onmousedown(e.touches[0]);
    };
    canvas.ontouchmove = (e) => {
      e.preventDefault();
      canvas.onmousemove(e.touches[0]);
    };
    canvas.ontouchend = (e) => {
      e.preventDefault();
      canvas.onmouseup(e.changedTouches[0]);
    };
    renderKG();
  }

  function renderKG() {
    const canvas = document.getElementById("kgCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width,
      H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    /* Grid bg */
    ctx.strokeStyle = "rgba(0,200,255,.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    const nodeMap = Object.fromEntries(
      KG_DOMAIN_NODES.map((n) => [n.id, n]),
    );
    /* Draw edges */
    const drawn = new Set();
    KG_DOMAIN_NODES.forEach((node) => {
      node.connections.forEach((tid) => {
        const key = [node.id, tid].sort().join("-");
        if (drawn.has(key)) return;
        drawn.add(key);
        const target = nodeMap[tid];
        if (!target) return;
        const isSelected =
          kgSelected &&
          (kgSelected.id === node.id || kgSelected.id === tid);
        const alpha = kgSelected ? (isSelected ? 0.7 : 0.06) : 0.2;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = isSelected
          ? `${node.color}${Math.round(alpha * 255)
              .toString(16)
              .padStart(2, "0")}`
          : `rgba(100,116,139,${alpha})`;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();
      });
    });
    /* Extra AI-discovered links */
    kgExtraLinks.slice(0, 20).forEach((link) => {
      const fn = KG_DOMAIN_NODES.find((n) =>
        n.label
          .toLowerCase()
          .includes((link.from || "").toLowerCase().slice(0, 4)),
      );
      const tn = KG_DOMAIN_NODES.find((n) =>
        n.label
          .toLowerCase()
          .includes((link.to || "").toLowerCase().slice(0, 4)),
      );
      if (!fn || !tn || fn === tn) return;
      ctx.beginPath();
      ctx.moveTo(fn.x, fn.y);
      ctx.lineTo(tn.x, tn.y);
      ctx.strokeStyle = "rgba(168,85,247,.15)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });
    /* Draw nodes */
    KG_DOMAIN_NODES.forEach((node) => {
      const isSel = kgSelected?.id === node.id;
      const isConn = kgSelected && kgSelected.connections.includes(node.id);
      const alpha = kgSelected ? (isSel || isConn ? 1 : 0.3) : 1;
      /* Glow */
      if (isSel) {
        const glow = ctx.createRadialGradient(
          node.x,
          node.y,
          0,
          node.x,
          node.y,
          node.size * 3,
        );
        glow.addColorStop(0, node.color + "44");
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      /* Circle */
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
      ctx.fillStyle = node.color + "22";
      ctx.fill();
      ctx.strokeStyle = node.color + (isSel ? "ff" : "88");
      ctx.lineWidth = isSel ? 2.5 : 1.5;
      ctx.stroke();
      /* Label */
      ctx.fillStyle = isSel ? "#fff" : node.color + "cc";
      ctx.font = `${isSel ? 700 : 600} ${node.size * 0.7 + 7}px Inter,sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.label, node.x, node.y);
      ctx.globalAlpha = 1;
    });
    kgAnimFrame = requestAnimationFrame(renderKG);
  }

  function showKGNodeDetail(node) {
    const el = document.getElementById("kgNodeDetail");
    if (!el) return;
    if (!node) {
      el.style.display = "none";
      return;
    }
    const connNames = node.connections
      .map((c) => KG_DOMAIN_NODES.find((n) => n.id === c)?.label || c)
      .join(" · ");
    const extra = kgExtraLinks
      .filter(
        (l) =>
          l.from
            ?.toLowerCase()
            .includes(node.label.toLowerCase().slice(0, 5)) ||
          l.to
            ?.toLowerCase()
            .includes(node.label.toLowerCase().slice(0, 5)),
      )
      .slice(0, 3);
    el.style.display = "block";
    el.innerHTML = `<span style="color:${node.color};font-weight:800;font-size:12px;">${node.label}</span><br>
    <span style="color:#64748b;">Connects to: </span>${connNames}<br>
    ${extra.length ? '<br><span style="color:#64748b;">AI-discovered links:</span><br>' + extra.map((l) => `<span style="color:#a855f7;">• ${l.from} → ${l.to}</span> <span style="color:#475569;">(${l.type || "related"}${l.description ? ": " + l.description.slice(0, 80) : ""})</span>`).join("<br>") : ""}`;
  }

  async function runConsolidate() {
    const btn = document.getElementById("kgConsolidateBtn");
    const stat = document.getElementById("kgStatus");
    btn.textContent = "⏳ Consolidating…";
    btn.disabled = true;
    stat.textContent =
      "Running memory consolidation — extracting cross-domain links…";
    try {
      const res = await fetch("/api/consolidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed");
      kgExtraLinks = data.crossDomainLinks || [];
      /* Render cluster badges */
      const clusterEl = document.getElementById("kgClusters");
      if (clusterEl && data.clusters?.length) {
        clusterEl.innerHTML = data.clusters
          .map(
            (c) => `
        <div style="padding:6px 12px;background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.2);border-radius:20px;font-size:10px;cursor:default;" title="${c.insight || ""}">
          <span style="color:#a855f7;font-weight:700;">${c.name}</span>
          <span style="color:#475569;"> — ${(c.technologies || []).slice(0, 3).join(", ")}</span>
          <span style="color:#334155;"> [${c.emergence || "?"}]</span>
        </div>`,
          )
          .join("");
      }
      stat.textContent = `Memory consolidated — ${data.crossDomainLinks?.length || 0} cross-domain links found, ${data.clusters?.length || 0} clusters detected`;
      addFloatMsg(
        `🕸️ Memory Consolidation complete\n\n• ${data.crossDomainLinks?.length || 0} cross-domain connections mapped\n• ${data.clusters?.length || 0} emerging technology clusters identified\n• ${data.entities || 0} entities extracted from all 14 domains`,
        "ai",
      );
    } catch (e) {
      stat.textContent = "Consolidation failed: " + e.message;
    }
    btn.textContent = "🧠 Re-Consolidate Memory";
    btn.disabled = false;
  }

  function filterMx(f) {
    document.querySelectorAll(".pc").forEach((c) => {
      c.classList.toggle("hide", f !== "all" && c.dataset.s !== f);
    });
    document
      .querySelectorAll(".fbtn")
      .forEach((b) => b.classList.remove("fa", "fn", "fnr", "ff"));
    const map = {
      all: "fa",
      now: "fn",
      near: "fnr",
      far: "ff",
      spec: "fa",
      civ: "fa",
    };
    const btn = document.querySelector(`.fbtn[data-f="${f}"]`);
    if (btn) btn.classList.add(map[f]);

    /* hide phase rows that have no visible cards */
    document.querySelectorAll(".phase-row").forEach((row) => {
      const grid = row.nextElementSibling;
      if (!grid || !grid.classList.contains("pgrid")) return;
      const visible = [...grid.querySelectorAll(".pc")].some(
        (c) => !c.classList.contains("hide"),
      );
      row.style.display = visible ? "" : "none";
    });
  }

  /* Auto-filter spec/civ cards when clicking filter buttons */
  document.addEventListener("click", (e) => {
    if (
      e.target.classList.contains("phase-pill") &&
      e.target.dataset.filter
    ) {
      const f = e.target.dataset.filter;
      if (["spec", "civ", "now", "near", "far"].includes(f)) filterMx(f);
    }
  });

  /* Smooth active-nav on scroll */
  const domainSections = document.querySelectorAll(".domain-sec,[id]");
  const navLinks = document.querySelectorAll(".nav-links a");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          navLinks.forEach((a) => a.classList.remove("active"));
          const match = document.querySelector(
            `.nav-links a[href="#${e.target.id}"]`,
          );
          if (match) match.classList.add("active");
        }
      });
    },
    { threshold: 0.25 },
  );
  document
    .querySelectorAll("section[id], .domain-sec[id]")
    .forEach((s) => io.observe(s));

  /* ════ AI RANKINGS RADAR GRAPH ════ */
  const RANK_METRICS = [
    { id: "speed", label: "Response Speed", icon: "⚡" },
    { id: "depth", label: "Domain Depth", icon: "🧠" },
    { id: "memory", label: "Memory & Context", icon: "💾" },
    { id: "code", label: "Code Generation", icon: "⌨️" },
    { id: "reason", label: "Reasoning", icon: "🔍" },
    { id: "data", label: "Data Analysis", icon: "📊" },
    { id: "create", label: "Creativity", icon: "✨" },
    { id: "live", label: "Live Intelligence", icon: "📡" },
  ];
  const RANK_PLATFORMS = [
    {
      name: "Algalon",
      s: {
        speed: 64,
        depth: 78,
        memory: 82,
        code: 72,
        reason: 74,
        data: 80,
        create: 70,
        live: 92,
      },
      col: "#00c4ff",
      main: true,
    },
    {
      name: "ChatGPT",
      s: {
        speed: 80,
        depth: 88,
        memory: 75,
        code: 92,
        reason: 90,
        data: 85,
        create: 88,
        live: 45,
      },
      col: "#74c69d",
    },
    {
      name: "Perplexity",
      s: {
        speed: 82,
        depth: 72,
        memory: 65,
        code: 58,
        reason: 76,
        data: 70,
        create: 60,
        live: 88,
      },
      col: "#a855f7",
    },
    {
      name: "Gemini",
      s: {
        speed: 78,
        depth: 84,
        memory: 78,
        code: 84,
        reason: 86,
        data: 88,
        create: 80,
        live: 55,
      },
      col: "#4285f4",
    },
    {
      name: "Claude.ai",
      s: {
        speed: 76,
        depth: 90,
        memory: 80,
        code: 88,
        reason: 92,
        data: 82,
        create: 85,
        live: 40,
      },
      col: "#d97706",
    },
  ];
  let _rmi = 0;
  function rankNavStep(d) {
    _rmi = (_rmi + d + RANK_METRICS.length) % RANK_METRICS.length;
    renderRankGraph();
  }
  function initRankGraph() {
    renderRankGraph();
  }
  function renderRankGraph() {
    const canvas = document.getElementById("rankGraphCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width,
      H = canvas.height;
    const N = RANK_METRICS.length;
    const CX = W / 2,
      CY = H / 2 + 8,
      R = Math.min(W, H) * 0.34;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(0,200,255,.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    [0.25, 0.5, 0.75, 1].forEach((f) => {
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 - Math.PI / 2;
        const x = CX + Math.cos(a) * R * f,
          y = CY + Math.sin(a) * R * f;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(0,200,255,${f === 1 ? 0.18 : 0.06})`;
      ctx.lineWidth = f === 1 ? 1.2 : 0.6;
      ctx.stroke();
    });
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2,
        hl = i === _rmi;
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(CX + Math.cos(a) * R, CY + Math.sin(a) * R);
      ctx.strokeStyle = hl ? "rgba(0,200,255,.45)" : "rgba(0,200,255,.1)";
      ctx.lineWidth = hl ? 2 : 0.7;
      ctx.stroke();
      const lx = CX + Math.cos(a) * (R + 26),
        ly = CY + Math.sin(a) * (R + 26);
      ctx.font = `${hl ? 700 : 500} 10px Inter,sans-serif`;
      ctx.fillStyle = hl ? "#00c4ff" : "#3d5270";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        RANK_METRICS[i].icon + " " + RANK_METRICS[i].label,
        lx,
        ly,
      );
    }
    [...RANK_PLATFORMS].reverse().forEach((p) => {
      ctx.beginPath();
      RANK_METRICS.forEach((m, i) => {
        const a = (i / N) * Math.PI * 2 - Math.PI / 2;
        const x = CX + Math.cos(a) * R * (p.s[m.id] / 100),
          y = CY + Math.sin(a) * R * (p.s[m.id] / 100);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = p.col + (p.main ? "28" : "0e");
      ctx.strokeStyle = p.col + (p.main ? "ee" : "55");
      ctx.lineWidth = p.main ? 2.4 : 1;
      ctx.fill();
      ctx.stroke();
    });
    const ha = (_rmi / N) * Math.PI * 2 - Math.PI / 2;
    RANK_PLATFORMS.forEach((p) => {
      const sc = p.s[RANK_METRICS[_rmi].id] / 100,
        dx = CX + Math.cos(ha) * R * sc,
        dy = CY + Math.sin(ha) * R * sc;
      const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, 9);
      g.addColorStop(0, p.col + "cc");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(dx, dy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.arc(dx, dy, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    RANK_PLATFORMS.forEach((p, i) => {
      const lx = 14,
        ly = 18 + i * 20;
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.rect(lx, ly, 10, 10);
      ctx.fill();
      ctx.font = `${p.main ? 700 : 500} 10px Inter,sans-serif`;
      ctx.fillStyle = p.main ? "#e2e8f0" : "#4e6080";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(p.name + (p.main ? " ← YOU" : ""), lx + 14, ly + 5);
      ctx.font = "700 10px Inter,sans-serif";
      ctx.fillStyle = p.col;
      ctx.textAlign = "right";
      ctx.fillText(p.s[RANK_METRICS[_rmi].id], W - 12, ly + 5);
    });
    const lbl = document.getElementById("rankGraphLabel");
    const m = RANK_METRICS[_rmi];
    if (lbl)
      lbl.textContent = `Focus: ${m.icon} ${m.label} — ‹ › to cycle all 8 metrics`;
  }

  /* ════ STAT BAR LIVE UPDATE ════ */
  async function updateStatBar() {
    try {
      const h = await fetch("/api/health").then((r) => r.json());
      const total = h.totalSlots || 384,
        assigned = h.assignedSlots || 0,
        pct = total > 0 ? Math.round((assigned / total) * 100) : 0;
      const s = document.getElementById("statImageSlots"),
        p = document.getElementById("statImagePct"),
        b = document.getElementById("statImageBar");
      if (s) s.textContent = total;
      if (p) p.textContent = `${assigned}/${total} FILLED`;
      if (b) b.style.width = pct + "%";
      if (h.worldIntelCards) {
        const el = document.getElementById("statIntelCards");
        if (el) el.textContent = h.worldIntelCards;
      }
    } catch {}
  }

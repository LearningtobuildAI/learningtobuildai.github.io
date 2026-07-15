
(function () {
  const ARIA_WS =
    "ws://localhost:7000/ws/site-" +
    Math.random().toString(36).slice(2, 6);
  let ariaWs = null;
  let ariaRunning = false;
  let ariaThinkEl = null;

  function connectAria() {
    ariaWs = new WebSocket(ARIA_WS);
    ariaWs.onopen = () => {
      ariaWs.send(JSON.stringify({ type: "ping" }));
    };
    ariaWs.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "pong" || msg.type === "status") {
        const p = msg.provider === "gpu" ? "⚡ GPU" : "✦ Claude";
        document.getElementById("aria-provider").textContent = p;
        document.getElementById("aria-dot").style.background = "#22c55e";
      }
      if (msg.type === "thinking_start") showAriaThinking();
      if (msg.type === "tool_call") {
        removeAriaThinking();
        appendAriaMsg("tool", "⚙ " + msg.name);
        showAriaThinking();
      }
      if (msg.type === "thinking" && msg.text) {
        // update thinking label
      }
      if (msg.type === "response") {
        removeAriaThinking();
        appendAriaMsg("aria", msg.text);
        ariaRunning = false;
        document.getElementById("aria-send").disabled = false;
      }
      if (msg.type === "error") {
        removeAriaThinking();
        appendAriaMsg("aria", "⚠ " + msg.text);
        ariaRunning = false;
        document.getElementById("aria-send").disabled = false;
      }
    };
    ariaWs.onclose = () => {
      document.getElementById("aria-dot").style.background = "#ef4444";
      document.getElementById("aria-provider").textContent = "offline";
      setTimeout(connectAria, 3000);
    };
  }

  function appendAriaMsg(role, text) {
    const msgs = document.getElementById("aria-messages");
    const d = document.createElement("div");
    d.className = "aria-msg " + role;
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }

  renderChatSessionSummary();
  document.getElementById("floatPanel")?.classList.add("float-open");
  autoResizeFloatInput();
  document
    .getElementById("floatInput")
    ?.addEventListener("input", autoResizeFloatInput);
  refreshChatRuntimeStatus();
  refreshAlgalonStatusBar();
  chatRuntimePoll = setInterval(refreshChatRuntimeStatus, 15000);
  setInterval(refreshAlgalonStatusBar, 5000);
  refreshSystemPanels();
  setInterval(refreshSystemPanels, 9000);
  refreshMonitoringDashboard();
  setInterval(refreshMonitoringDashboard, 15000);
  reportMonitoringActivity("view");
  setInterval(() => reportMonitoringActivity("heartbeat"), 120000);
  initAlgalon3dViewer();
  function showAriaThinking() {
    if (ariaThinkEl) return;
    const msgs = document.getElementById("aria-messages");
    ariaThinkEl = document.createElement("div");
    ariaThinkEl.className = "aria-thinking";
    ariaThinkEl.innerHTML = "<span></span><span></span><span></span>";
    msgs.appendChild(ariaThinkEl);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeAriaThinking() {
    if (ariaThinkEl) {
      ariaThinkEl.remove();
      ariaThinkEl = null;
    }
  }

  window.toggleAria = function () {
    const panel = document.getElementById("aria-panel");
    panel.classList.toggle("open");
    if (panel.classList.contains("open") && !ariaWs) connectAria();
    if (
      panel.classList.contains("open") &&
      ariaWs &&
      ariaWs.readyState !== 1
    )
      connectAria();
  };

  window.ariaSend = function () {
    const input = document.getElementById("aria-input");
    const text = input.value.trim();
    if (!text || ariaRunning) return;
    if (!ariaWs || ariaWs.readyState !== 1) {
      connectAria();
      return;
    }
    appendAriaMsg("user", text);
    input.value = "";
    ariaRunning = true;
    document.getElementById("aria-send").disabled = true;
    ariaWs.send(JSON.stringify({ type: "message", text }));
  };

  window.ariaKey = function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ariaSend();
    }
  };

  // Auto-connect when panel is first opened
  if (document.getElementById("aria-panel").classList.contains("open"))
    connectAria();
})();

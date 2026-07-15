const chatBox = document.getElementById("chat-box");
const inputEl = document.getElementById("promptInput");
const btnEl = document.getElementById("talkBtn");
const adminPublicBtn = document.getElementById("adminPublicBtn");

function appendMessage(role, text) {
  if (!chatBox) return;
  const node = document.createElement("div");
  node.className = `message ${role}`;
  node.textContent = text;
  chatBox.appendChild(node);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function switchToPublicChat() {
  window.dispatchEvent(new CustomEvent("site-shell-open-chat"));
  const widget = document.getElementById("siteMovableChat");
  if (widget) {
    widget.scrollIntoView({ block: "end", behavior: "smooth" });
  }
}

adminPublicBtn?.addEventListener("click", switchToPublicChat);

async function talkToDesktopAI(prompt) {
  const preferBridge = window.location.origin.includes(":3000");
  if (preferBridge) {
    const bridgeRes = await fetch("/api/bridge/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!bridgeRes.ok) {
      throw new Error(
        `Desktop AI bridge request failed with status ${bridgeRes.status}`,
      );
    }
    const bridgeData = await bridgeRes.json();
    return bridgeData.response || "No response from Desktop AI.";
  }

  try {
    const direct = await fetch("http://localhost:5000/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (direct.ok) {
      const data = await direct.json();
      return data.response || "No response from Desktop AI.";
    }
  } catch {
  }

  const res = await fetch("/api/bridge/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    throw new Error(
      `Desktop AI bridge request failed with status ${res.status}`,
    );
  }
  const data = await res.json();
  return data.response || "No response from Desktop AI.";
}

async function checkBridge() {
  try {
    const preferBridge = window.location.origin.includes(":3000");
    const res = preferBridge
      ? await fetch("/api/bridge/health")
      : await fetch("http://localhost:5000/health");
    const data = await res.json();
    document.getElementById("bridge-online").innerText =
      data.status === "online" || data.ok ? "Online ✓" : "Offline ✗";
    document.getElementById("bridge-gpu").innerText =
      "GPU: " +
      (data.gpu || data.cuda_available || data.upstream?.cuda_available
        ? "Active"
        : "Not Active");
  } catch {
    document.getElementById("bridge-online").innerText = "Offline ✗";
    document.getElementById("bridge-gpu").innerText = "";
  }
}

btnEl?.addEventListener("click", async () => {
  const prompt = (inputEl?.value || "").trim();
  if (!prompt) return;

  appendMessage("user", prompt);
  inputEl.value = "";

  try {
    const response = await talkToDesktopAI(prompt);
    appendMessage("assistant", response);
  } catch (error) {
    appendMessage("assistant", `Error: ${error.message}`);
  }
});

inputEl?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    btnEl?.click();
  }
});

appendMessage("assistant", "Desktop AI bridge ready. Ask your first prompt.");
checkBridge();
setInterval(checkBridge, 2000);

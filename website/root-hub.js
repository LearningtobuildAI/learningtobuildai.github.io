const dockLog = document.getElementById("dockLog");
const dockInput = document.getElementById("dockInput");
const dockSend = document.getElementById("dockSend");
const dockStatus = document.getElementById("dockStatus");

function appendDock(role, text) {
  if (!dockLog) return;
  const el = document.createElement("div");
  el.className = `msg ${role === "user" ? "user" : "bot"}`;
  el.textContent = text;
  dockLog.appendChild(el);
  dockLog.scrollTop = dockLog.scrollHeight;
}

async function sendDockMessage() {
  if (!dockInput || !dockSend || !dockStatus) return;
  const text = String(dockInput.value || "").trim();
  if (!text) return;
  appendDock("user", text);
  dockInput.value = "";
  dockStatus.textContent = "sending";
  dockSend.disabled = true;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        provider: "guide",
        threadId: "main-dock",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "chat error");
    appendDock("bot", String(data.text || "No response."));
    dockStatus.textContent = "ready";
  } catch (err) {
    appendDock("bot", `Chat error: ${err.message}`);
    dockStatus.textContent = "error";
  } finally {
    dockSend.disabled = false;
  }
}

if (dockSend && dockInput) {
  dockSend.addEventListener("click", sendDockMessage);
  dockInput.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") sendDockMessage();
  });
}

const mainHubHeroPhoto = document.getElementById("mainHubHeroPhoto");
if (mainHubHeroPhoto) {
  let fallbackTried = false;
  mainHubHeroPhoto.addEventListener("error", () => {
    if (!fallbackTried) {
      fallbackTried = true;
      mainHubHeroPhoto.src = "/images/generated/default.jpg";
      return;
    }
    const wrap = mainHubHeroPhoto.closest(".hero-photo-wrap");
    if (wrap) wrap.style.display = "none";
  });
}


/* ── NEURAL NETWORK CANVAS ANIMATION ── */
(function () {
  const canvas = document.getElementById("neuralCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, nodes, animId;
  const NODE_COUNT = 70;
  const MAX_DIST = 160;
  const COLORS = ["#00c4ff", "#7c3aed", "#a855f7", "#38d9ff"];

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function initNodes() {
    nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: 1.5 + Math.random() * 2,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
      o: 0.4 + Math.random() * 0.6,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      a.x += a.vx;
      a.y += a.vy;
      if (a.x < 0 || a.x > W) a.vx *= -1;
      if (a.y < 0 || a.y > H) a.vy *= -1;
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x,
          dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < MAX_DIST) {
          const alpha = (1 - d / MAX_DIST) * 0.18;
          ctx.beginPath();
          ctx.strokeStyle = a.c;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = 0.8;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = a.o * 0.8;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fillStyle = a.c;
      ctx.fill();
      const grd = ctx.createRadialGradient(
        a.x,
        a.y,
        0,
        a.x,
        a.y,
        a.r * 6,
      );
      grd.addColorStop(
        0,
        a.c.replace(")", ",0.15)").replace("rgb", "rgba"),
      );
      grd.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r * 6, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    animId = requestAnimationFrame(draw);
  }

  resize();
  initNodes();
  draw();
  window.addEventListener("resize", () => {
    resize();
  });
})();

/* ── TIMELINE ICONS ── */
(function () {
  const ICONS = {
    "Fire Controlled": ["🔥", "#f59e0b"],
    "Hafted Stone Tools": ["🪨", "#d97706"],
    "Symbolic Ochre Art": ["🎨", "#f59e0b"],
    "Cave Paintings": ["🖼", "#d97706"],
    "Agriculture Begins": ["🌾", "#84cc16"],
    "The Wheel": ["⚙️", "#22c55e"],
    "Writing — Cuneiform": ["📜", "#22c55e"],
    "Bronze Metallurgy": ["⚒️", "#4ade80"],
    "Pyramids of Giza": ["🏛️", "#22c55e"],
    "Iron Age Smelting": ["🔨", "#86efac"],
    "Antikythera Mechanism": ["⚙️", "#22c55e"],
    "Archimedes — Lever, Screw, Pi": ["📐", "#4ade80"],
    "Paper Invented": ["📄", "#22c55e"],
    Gunpowder: ["💥", "#4ade80"],
    "Moveable Type Printing": ["📰", "#22c55e"],
    "Gutenberg Press": ["🖨️", "#38bdf8"],
    "Copernican Heliocentrism": ["🌍", "#38bdf8"],
    "Microscope Invented": ["🔬", "#38bdf8"],
    "Galileo's Telescope": ["🔭", "#38bdf8"],
    "Newton — Laws of Motion": ["🍎", "#38bdf8"],
    "Watt Steam Engine": ["🚂", "#0ea5e9"],
    "Smallpox Vaccine": ["💉", "#0ea5e9"],
    "First Photograph": ["📷", "#0ea5e9"],
    "Electric Telegraph": ["📡", "#0ea5e9"],
    Telephone: ["☎️", "#0ea5e9"],
    "Incandescent Light Bulb": ["💡", "#0ea5e9"],
    "Internal Combustion Car": ["🚗", "#0ea5e9"],
    "Radio Transmission": ["📻", "#0ea5e9"],
    "X-Rays Discovered": ["☢️", "#38bdf8"],
    "Powered Flight": ["✈️", "#a855f7"],
    "Special Relativity": ["⚛️", "#a855f7"],
    "Penicillin Discovered": ["💊", "#a855f7"],
    "Nuclear Fission Weapon": ["☢️", "#c084fc"],
    "Transistor Invented": ["💡", "#a855f7"],
    "DNA Double Helix": ["🧬", "#a855f7"],
    "Sputnik — First Satellite": ["🛸", "#c084fc"],
    "First Human in Space": ["👨‍🚀", "#a855f7"],
    "Moon Landing": ["🌕", "#c084fc"],
    "ARPANET — Internet Precursor": ["🌐", "#a855f7"],
    "First Microprocessor — Intel 4004": ["💾", "#14b8a6"],
    "First Mobile Phone Call": ["📱", "#14b8a6"],
    "Apple Computer Founded": ["🍎", "#14b8a6"],
    "TCP/IP — Modern Internet": ["🌐", "#14b8a6"],
    "World Wide Web": ["🕸️", "#14b8a6"],
    "Linux Kernel Released": ["🐧", "#14b8a6"],
    "Deep Blue Beats Kasparov": ["♟️", "#14b8a6"],
    "Google Founded": ["🔍", "#14b8a6"],
    "Human Genome Sequenced": ["🧬", "#14b8a6"],
    "iPhone Launched": ["📱", "#14b8a6"],
    "AlexNet — Deep Learning Breakthrough": ["🤖", "#ec4899"],
    "AlphaGo Beats Lee Sedol": ["♟️", "#ec4899"],
    '"Attention Is All You Need" — Transformers': ["🧠", "#ec4899"],
    "mRNA COVID Vaccines": ["💉", "#ec4899"],
    "AlphaFold 2 — Protein Folding Solved": ["🧬", "#ec4899"],
    "ChatGPT — 100M users in 60 days": ["💬", "#ec4899"],
    "First CRISPR Medicine — Casgevy": ["✂️", "#f472b6"],
    "Humanoid Robots Enter Factories": ["🦾", "#ec4899"],
    "AI Runs Scientific Experiments Autonomously": ["🔬", "#f472b6"],
  };

  document.querySelectorAll(".tl-item").forEach((item) => {
    const evtEl = item.querySelector(".tl-evt");
    if (!evtEl) return;
    const key = evtEl.textContent.trim();
    const entry = ICONS[key];
    if (!entry) return;
    const [icon, color] = entry;

    const box = document.createElement("div");
    box.className = "tl-icon-box";
    box.style.background = color + "18";
    box.style.borderColor = color + "40";
    box.style.boxShadow = `0 0 16px ${color}30`;
    box.textContent = icon;
    box.title = `Click for full detail: ${key}`;
    box.addEventListener("click", () =>
      openDetail(
        key,
        "Current/Future Tech",
        "",
        `Historical invention: ${key}`,
        `tl-${key
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 40)}`,
      ),
    );

    // inject into content-above or content-below, before .tl-evt
    const contentDiv =
      item.querySelector(".tl-content-above") ||
      item.querySelector(".tl-content-below");
    if (contentDiv) contentDiv.insertBefore(box, contentDiv.firstChild);
  });
})();

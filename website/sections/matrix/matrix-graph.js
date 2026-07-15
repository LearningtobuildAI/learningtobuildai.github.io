/*
 * Matrix — Cross-Domain Knowledge Graph engine.
 * Renders the 14 technology domains as an interactive node-link graph.
 *   • Nodes   = domains (click / hover to focus).
 *   • Edges   = cross-domain relationships & technology dependencies.
 *   • Panel   = per-domain material → process → energy → output chain,
 *               connected domains, and an AI-style synthesis insight.
 * Dependency-free (hand-rolled SVG). Free/local data only.
 */
(function () {
  "use strict";

  const DOMAINS = [
    { id: "ai", name: "AI", path: "domain-ai", color: "#38bdf8" },
    { id: "med", name: "Medicine", path: "domain-med", color: "#22c55e" },
    { id: "nrg", name: "Energy", path: "domain-nrg", color: "#f59e0b" },
    { id: "mat", name: "Materials", path: "domain-mat", color: "#a855f7" },
    { id: "neu", name: "Neuro", path: "domain-neu", color: "#ec4899" },
    { id: "spc", name: "Space", path: "domain-spc", color: "#60a5fa" },
    { id: "sec", name: "Security", path: "domain-sec", color: "#f43f5e" },
    { id: "gov", name: "Governance", path: "domain-gov", color: "#94a3b8" },
    { id: "bld", name: "Construction", path: "domain-bld", color: "#fb923c" },
    { id: "cos", name: "Cosmetics", path: "domain-cos", color: "#f472b6" },
    { id: "smt", name: "Smart Systems", path: "domain-smt", color: "#2dd4bf" },
    { id: "rob", name: "Robotics", path: "domain-robotics", color: "#818cf8" },
    { id: "tdp", name: "3D Printing", path: "domain-3dp", color: "#4ade80" },
    { id: "wi", name: "World Intel", path: "worldIntel", color: "#7dd3fc" },
  ];

  // [source, target, relationship]
  const EDGES = [
    ["ai", "rob", "controls"],
    ["ai", "med", "diagnoses"],
    ["ai", "neu", "models"],
    ["ai", "sec", "defends"],
    ["ai", "smt", "optimises"],
    ["ai", "spc", "navigates"],
    ["ai", "gov", "informs"],
    ["ai", "wi", "synthesises"],
    ["mat", "nrg", "enables"],
    ["mat", "bld", "supplies"],
    ["mat", "spc", "shields"],
    ["mat", "tdp", "feeds"],
    ["mat", "cos", "formulates"],
    ["mat", "rob", "embodies"],
    ["nrg", "spc", "launches"],
    ["nrg", "bld", "powers"],
    ["nrg", "smt", "drives"],
    ["rob", "bld", "constructs"],
    ["rob", "tdp", "fabricates"],
    ["med", "neu", "heals"],
    ["med", "cos", "enhances"],
    ["smt", "sec", "monitors"],
    ["smt", "gov", "governs"],
    ["tdp", "spc", "prints"],
    ["neu", "cos", "senses"],
    ["wi", "gov", "tracks"],
  ];

  const CHAINS = {
    ai: { material: "Silicon wafers, rare-earth magnets", process: "Chip fabrication + model training", energy: "Grid electricity for GPU/TPU clusters", output: "Autonomous decisions & predictions" },
    med: { material: "Biologics, reagents, polymers", process: "Synthesis, trials, gene editing", energy: "Lab + cold-chain power", output: "Diagnostics, therapies, cures" },
    nrg: { material: "Silicon, lithium, rare earths", process: "Generation, storage, conversion", energy: "Self-sustaining once built", output: "Electricity & motive power" },
    mat: { material: "Elements, composites, nanostructures", process: "Synthesis, alloying, fabrication", energy: "High-heat processing", output: "Substrates for all industry" },
    neu: { material: "Electrodes, biocompatible polymers", process: "Signal decoding, interface design", energy: "Ultra-low-power implants", output: "Brain–machine communication" },
    spc: { material: "Lightweight alloys, composites", process: "Manufacturing, launch, orbit ops", energy: "Propulsion + solar", output: "Launch, comms, observation" },
    sec: { material: "Compute, sensors, crypto keys", process: "Encryption, detection, response", energy: "Continuous compute", output: "Trust & system integrity" },
    gov: { material: "Data, standards, records", process: "Policy, coordination, oversight", energy: "Administrative compute", output: "Rules, funding, coordination" },
    bld: { material: "Concrete, steel, printed composites", process: "Design + robotic assembly", energy: "Machinery + site power", output: "Infrastructure & habitats" },
    cos: { material: "Bioactives, polymers, pigments", process: "Formulation, testing", energy: "Manufacturing power", output: "Health & aesthetic products" },
    smt: { material: "Sensors, chips, connectivity", process: "Integration, orchestration", energy: "Low-power distributed", output: "Responsive environments" },
    rob: { material: "Actuators, sensors, alloys", process: "Assembly, control, learning", energy: "Battery + grid", output: "Physical labour & dexterity" },
    tdp: { material: "Polymers, metals, bio-inks", process: "Additive layer fabrication", energy: "Print-head + curing power", output: "On-demand custom parts" },
    wi: { material: "Global data streams", process: "Aggregation, verification, synthesis", energy: "Ingestion compute", output: "Verified world intelligence" },
  };

  const INSIGHTS = {
    ai: "The connective layer — AI turns every domain's data into decisions and automation.",
    med: "Merging with AI and neuro to shift from treatment toward prediction and prevention.",
    nrg: "Every other domain scales only as far as clean, abundant energy allows.",
    mat: "The upstream domain — new materials unlock energy, space, medicine and compute.",
    neu: "The bridge between biology and computing, powered by AI signal models.",
    spc: "A proving ground for materials, energy and autonomy under extreme constraints.",
    sec: "Secures every other domain; increasingly driven by AI threat detection.",
    gov: "Sets the pace of adoption; informed by world-intel and smart systems.",
    bld: "Being reshaped by robotics and 3D printing into automated construction.",
    cos: "Increasingly biotech-driven, blending materials science and medicine.",
    smt: "The nervous system linking devices, energy and AI into responsive systems.",
    rob: "AI's body — executing decisions in the physical world across every industry.",
    tdp: "Distributed manufacturing — printing materials into parts anywhere, even in orbit.",
    wi: "The observation layer — tracking every domain's real-world progress in real time.",
  };

  function init() {
    const host = document.getElementById("matrixGraph");
    const panel = document.getElementById("matrixPanel");
    if (!host || !panel) return;

    const NS = "http://www.w3.org/2000/svg";
    const W = 1000;
    const H = 660;
    const cx = W / 2;
    const cy = H / 2;
    const R = 250;

    // Position nodes evenly on a circle.
    const pos = {};
    DOMAINS.forEach((d, i) => {
      const a = (i / DOMAINS.length) * Math.PI * 2 - Math.PI / 2;
      pos[d.id] = { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
    });

    const adj = {};
    DOMAINS.forEach((d) => (adj[d.id] = []));
    EDGES.forEach(([a, b, rel]) => {
      adj[a].push({ id: b, rel });
      adj[b].push({ id: a, rel });
    });

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("class", "mx-svg");
    svg.setAttribute("role", "application");
    svg.setAttribute("aria-label", "Cross-domain knowledge graph");

    // Edges.
    const edgeEls = [];
    EDGES.forEach(([a, b, rel]) => {
      const p1 = pos[a];
      const p2 = pos[b];
      const mx = (p1.x + p2.x) / 2 + (cy - (p1.y + p2.y) / 2) * 0.12;
      const my = (p1.y + p2.y) / 2 + ((p1.x + p2.x) / 2 - cx) * 0.12;
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", "M" + p1.x + "," + p1.y + " Q" + mx + "," + my + " " + p2.x + "," + p2.y);
      path.setAttribute("class", "mx-edge");
      path.dataset.a = a;
      path.dataset.b = b;
      svg.appendChild(path);
      edgeEls.push(path);
    });

    // Nodes.
    const nodeEls = {};
    DOMAINS.forEach((d) => {
      const p = pos[d.id];
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "mx-node");
      g.setAttribute("transform", "translate(" + p.x + "," + p.y + ")");
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", d.name);

      const halo = document.createElementNS(NS, "circle");
      halo.setAttribute("r", "30");
      halo.setAttribute("class", "mx-halo");
      halo.setAttribute("fill", d.color);

      const c = document.createElementNS(NS, "circle");
      c.setAttribute("r", "22");
      c.setAttribute("class", "mx-dot");
      c.setAttribute("fill", "#0b1224");
      c.setAttribute("stroke", d.color);

      const label = document.createElementNS(NS, "text");
      label.setAttribute("class", "mx-label");
      label.setAttribute("y", "46");
      label.setAttribute("text-anchor", "middle");
      label.textContent = d.name;

      const abbr = document.createElementNS(NS, "text");
      abbr.setAttribute("class", "mx-abbr");
      abbr.setAttribute("text-anchor", "middle");
      abbr.setAttribute("dy", "4");
      abbr.setAttribute("fill", d.color);
      abbr.textContent = d.name.slice(0, 3).toUpperCase();

      g.append(halo, c, abbr, label);
      svg.appendChild(g);
      nodeEls[d.id] = g;

      const focus = () => select(d.id);
      g.addEventListener("mouseenter", focus);
      g.addEventListener("click", focus);
      g.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          focus();
        }
      });
    });

    host.appendChild(svg);

    function esc(s) {
      return String(s).replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
      );
    }

    function select(id) {
      const d = DOMAINS.find((x) => x.id === id);
      if (!d) return;
      const near = new Set([id, ...adj[id].map((n) => n.id)]);

      DOMAINS.forEach((x) => {
        nodeEls[x.id].classList.toggle("dim", !near.has(x.id));
        nodeEls[x.id].classList.toggle("active", x.id === id);
      });
      edgeEls.forEach((e) => {
        const on = e.dataset.a === id || e.dataset.b === id;
        e.classList.toggle("on", on);
        e.classList.toggle("dim", !on);
      });

      const chain = CHAINS[id] || {};
      const conns = adj[id]
        .map((n) => {
          const nd = DOMAINS.find((x) => x.id === n.id);
          return (
            '<a class="mx-conn" href="/website/sections/' + nd.path + '/index.html">' +
            '<span class="mx-conn-dot" style="background:' + nd.color + '"></span>' +
            esc(nd.name) + ' <em>' + esc(n.rel) + '</em></a>'
          );
        })
        .join("");

      panel.innerHTML =
        '<div class="mx-panel-head" style="border-color:' + d.color + '">' +
        '<span class="mx-panel-badge" style="background:' + d.color + '">' + esc(d.name.slice(0, 3).toUpperCase()) + "</span>" +
        '<div><div class="mx-panel-name">' + esc(d.name) + "</div>" +
        '<div class="mx-panel-sub">' + adj[id].length + " cross-domain links</div></div></div>" +
        '<div class="mx-insight">' + esc(INSIGHTS[id] || "") + "</div>" +
        '<div class="mx-chain-title">Material \u2192 Process \u2192 Energy \u2192 Output</div>' +
        '<div class="mx-chain">' +
        '<div class="mx-chain-step"><span>Material</span>' + esc(chain.material || "") + "</div>" +
        '<div class="mx-chain-arrow">\u2193</div>' +
        '<div class="mx-chain-step"><span>Process</span>' + esc(chain.process || "") + "</div>" +
        '<div class="mx-chain-arrow">\u2193</div>' +
        '<div class="mx-chain-step"><span>Energy</span>' + esc(chain.energy || "") + "</div>" +
        '<div class="mx-chain-arrow">\u2193</div>' +
        '<div class="mx-chain-step out"><span>Output</span>' + esc(chain.output || "") + "</div>" +
        "</div>" +
        '<div class="mx-chain-title">Connected domains</div>' +
        '<div class="mx-conns">' + conns + "</div>" +
        '<a class="mx-open" href="/website/sections/' + d.path + '/index.html">Open ' + esc(d.name) + " intelligence \u2192</a>";
    }

    // Default focus: AI (the most connected node).
    select("ai");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

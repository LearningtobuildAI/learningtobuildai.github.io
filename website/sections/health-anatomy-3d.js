/* Health — holographic 3D anatomy explorer.
   Rotatable/zoomable translucent body (three.js) with glowing organ nodes
   grouped by body system. Toggle systems, adjust body opacity, click a node
   to read what it is. Neon/holographic style to match the site. Fully offline
   (uses the vendored three.js + OrbitControls). */
import * as THREE from "three";
import { OrbitControls } from "/website/vendor/OrbitControls.js";

const HOST = document.getElementById("anatomy3d");
if (HOST) boot();

function boot() {
  // ── Systems + organ nodes (positions in body space, y-up, ~4 units tall) ──
  const SYSTEMS = {
    nervous: { label: "Nervous System", color: 0x818cf8 },
    endocrine: { label: "Endocrine (Hormones)", color: 0xf0abfc },
    respiratory: { label: "Respiratory System", color: 0x34d399 },
    cardiovascular: { label: "Cardiovascular System", color: 0xf87171 },
    "renal-hepatic": { label: "Liver & Kidneys", color: 0xfbbf24 },
    digestive: { label: "Digestive System", color: 0x4ade80 },
    musculoskeletal: { label: "Musculoskeletal", color: 0x94a3b8 },
  };
  const ORGANS = [
    { name: "Brain", sys: "nervous", pos: [0, 3.35, 0.05], r: 0.26,
      info: "Command centre — processes signals, controls movement, mood and memory. Fatigue, focus and sleep all trace here." },
    { name: "Spinal cord", sys: "nervous", pos: [0, 2.1, -0.25], r: 0.12,
      info: "The main data cable between brain and body. Nerve signals for movement and sensation run through it." },
    { name: "Thyroid / Hormones", sys: "endocrine", pos: [0, 2.72, 0.22], r: 0.16,
      info: "Endocrine glands release hormones that set metabolism, energy, growth and stress response." },
    { name: "Left lung", sys: "respiratory", pos: [-0.42, 1.95, 0.05], r: 0.28,
      info: "Oxygen in, CO₂ out. Breathing rate links directly to energy and stress." },
    { name: "Right lung", sys: "respiratory", pos: [0.42, 1.95, 0.05], r: 0.28,
      info: "Oxygen in, CO₂ out. Breathing rate links directly to energy and stress." },
    { name: "Heart", sys: "cardiovascular", pos: [-0.14, 1.85, 0.24], r: 0.22,
      info: "Pumps blood — oxygen and nutrients to every cell. Drives stamina and recovery." },
    { name: "Liver", sys: "renal-hepatic", pos: [0.3, 1.3, 0.2], r: 0.24,
      info: "The body's filter and chemical plant — detox, storage and hundreds of metabolic jobs." },
    { name: "Kidneys", sys: "renal-hepatic", pos: [0, 1.05, -0.15], r: 0.15,
      info: "Filter the blood, balance water and salts, regulate blood pressure." },
    { name: "Gut / Stomach", sys: "digestive", pos: [0, 0.75, 0.22], r: 0.3,
      info: "Breaks down food, absorbs nutrients, hosts the microbiome — tied to immunity and mood." },
    { name: "Muscles", sys: "musculoskeletal", pos: [0.62, 0.3, 0.05], r: 0.2,
      info: "Move the skeleton, burn energy, store glycogen. Strength and posture live here." },
  ];

  // ── Renderer / scene / camera ────────────────────────────────────────────
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    HOST.innerHTML = '<div class="an3d-fallback">3D not supported in this browser.</div>';
    return;
  }
  const W = () => HOST.clientWidth || 380;
  const H = () => HOST.clientHeight || 520;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.domElement.style.display = "block";
  HOST.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W() / H(), 0.1, 100);
  camera.position.set(0, 1.9, 7.5);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 1.8, 0);
  controls.minDistance = 4;
  controls.maxDistance = 14;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.9;
  controls.enablePan = false;

  scene.add(new THREE.AmbientLight(0x8fd3ff, 0.7));
  const key = new THREE.PointLight(0x67e8f9, 1.1, 40);
  key.position.set(4, 6, 6);
  scene.add(key);
  const rim = new THREE.PointLight(0x6366f1, 0.8, 40);
  rim.position.set(-5, 3, -4);
  scene.add(rim);

  // ── Holographic body ─────────────────────────────────────────────────────
  const bodyGroup = new THREE.Group();
  scene.add(bodyGroup);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, transparent: true, opacity: 0.14,
    emissive: 0x0ea5e9, emissiveIntensity: 0.35, roughness: 0.4, metalness: 0.1,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x67e8f9, wireframe: true, transparent: true, opacity: 0.12,
  });
  function limb(geo, x, y, z, rot) {
    const m = new THREE.Mesh(geo, bodyMat);
    m.position.set(x, y, z);
    if (rot) m.rotation.z = rot;
    const w = new THREE.Mesh(geo, wireMat);
    w.position.copy(m.position); w.rotation.copy(m.rotation);
    bodyGroup.add(m, w);
    return m;
  }
  // head, neck, torso, hips, arms, legs
  limb(new THREE.SphereGeometry(0.42, 24, 20), 0, 3.35, 0);
  limb(new THREE.CylinderGeometry(0.14, 0.18, 0.35, 16), 0, 2.95, 0);
  const torso = limb(new THREE.CapsuleGeometry(0.62, 1.15, 8, 20), 0, 1.9, 0);
  torso.scale.set(1, 1, 0.62);
  const hips = limb(new THREE.CapsuleGeometry(0.5, 0.35, 8, 20), 0, 0.95, 0);
  hips.scale.set(1, 1, 0.6);
  limb(new THREE.CapsuleGeometry(0.15, 1.35, 6, 12), -0.82, 1.85, 0, 0.16);
  limb(new THREE.CapsuleGeometry(0.15, 1.35, 6, 12), 0.82, 1.85, 0, -0.16);
  limb(new THREE.CapsuleGeometry(0.2, 1.7, 6, 12), -0.28, -0.35, 0);
  limb(new THREE.CapsuleGeometry(0.2, 1.7, 6, 12), 0.28, -0.35, 0);

  // ── Organ nodes + labels ─────────────────────────────────────────────────
  const nodeGroups = {}; // sys -> THREE.Group
  const pickables = [];
  Object.keys(SYSTEMS).forEach((s) => { nodeGroups[s] = new THREE.Group(); scene.add(nodeGroups[s]); });

  function labelSprite(text, colorHex) {
    const pad = 8, fs = 34;
    const cv = document.createElement("canvas");
    const ctx = cv.getContext("2d");
    ctx.font = `700 ${fs}px Inter, Arial`;
    const w = ctx.measureText(text).width + pad * 2;
    cv.width = w; cv.height = fs + pad * 2;
    ctx.font = `700 ${fs}px Inter, Arial`;
    ctx.fillStyle = "rgba(4,10,22,0.72)";
    roundRect(ctx, 0, 0, cv.width, cv.height, 10); ctx.fill();
    ctx.fillStyle = "#" + colorHex.toString(16).padStart(6, "0");
    ctx.textBaseline = "middle";
    ctx.fillText(text, pad, cv.height / 2 + 2);
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    spr.scale.set(cv.width / 150, cv.height / 150, 1);
    spr.renderOrder = 10;
    return spr;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  ORGANS.forEach((o) => {
    const col = SYSTEMS[o.sys].color;
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(o.r, 20, 16),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.9, roughness: 0.35 })
    );
    core.position.set(...o.pos);
    core.userData = o;
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(o.r * 1.7, 16, 12),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.16, depthWrite: false })
    );
    halo.position.copy(core.position);
    const lbl = labelSprite(o.name, col);
    lbl.position.set(o.pos[0] + o.r + 0.25, o.pos[1] + 0.12, o.pos[2]);
    nodeGroups[o.sys].add(core, halo, lbl);
    pickables.push(core);
  });

  // ── Info readout ─────────────────────────────────────────────────────────
  const readout = document.createElement("div");
  readout.className = "an3d-readout";
  readout.innerHTML = '<b>Explore the body</b><span>Drag to rotate · scroll to zoom · click a glowing node.</span>';
  HOST.appendChild(readout);

  let selected = null;
  function selectOrgan(o, mesh) {
    selected = mesh;
    readout.innerHTML = "<b>" + o.name + "</b><em>" + SYSTEMS[o.sys].label + "</em><span>" + o.info + "</span>";
    controls.autoRotate = false;
  }

  // ── Picking ──────────────────────────────────────────────────────────────
  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  function onClick(ev) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects(pickables, false).filter((h) => h.object.parent.visible);
    if (hits.length) selectOrgan(hits[0].object.userData, hits[0].object);
  }
  renderer.domElement.addEventListener("click", onClick);
  renderer.domElement.style.cursor = "grab";

  // ── Control panel (system toggles + opacity + reset) ─────────────────────
  const panel = document.createElement("div");
  panel.className = "an3d-panel";
  panel.innerHTML = '<div class="an3d-panel-h">Anatomy Explorer</div>';
  const toggles = document.createElement("div");
  toggles.className = "an3d-toggles";
  // Body toggle
  addToggle(toggles, "Body form", 0x38bdf8, true, (on) => { bodyGroup.visible = on; });
  Object.entries(SYSTEMS).forEach(([s, meta]) => {
    addToggle(toggles, meta.label, meta.color, true, (on) => { nodeGroups[s].visible = on; });
  });
  panel.appendChild(toggles);

  const opRow = document.createElement("div");
  opRow.className = "an3d-op";
  opRow.innerHTML = '<label>Body opacity</label>';
  const slider = document.createElement("input");
  slider.type = "range"; slider.min = "0"; slider.max = "100"; slider.value = "14";
  slider.addEventListener("input", () => {
    const v = Number(slider.value) / 100;
    bodyMat.opacity = v; wireMat.opacity = Math.min(0.2, v * 0.8);
  });
  opRow.appendChild(slider);
  panel.appendChild(opRow);

  const reset = document.createElement("button");
  reset.className = "an3d-reset-btn"; reset.type = "button"; reset.textContent = "↺ Reset view";
  reset.addEventListener("click", () => {
    camera.position.set(0, 1.9, 7.5); controls.target.set(0, 1.8, 0);
    controls.autoRotate = true; selected = null;
    readout.innerHTML = '<b>Explore the body</b><span>Drag to rotate · scroll to zoom · click a glowing node.</span>';
  });
  panel.appendChild(reset);
  HOST.appendChild(panel);

  function addToggle(host, label, color, on, fn) {
    const row = document.createElement("label");
    row.className = "an3d-toggle";
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = on;
    cb.addEventListener("change", () => fn(cb.checked));
    const dot = document.createElement("span");
    dot.className = "an3d-dot";
    dot.style.background = "#" + color.toString(16).padStart(6, "0");
    dot.style.boxShadow = "0 0 8px #" + color.toString(16).padStart(6, "0");
    const t = document.createElement("span"); t.textContent = label;
    row.append(cb, dot, t);
    host.appendChild(row);
  }

  // ── Animate ──────────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  (function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    // pulse organ halos + selected
    pickables.forEach((p, i) => {
      const s = 1 + Math.sin(t * 2 + i) * 0.06;
      p.scale.setScalar(p === selected ? 1.35 + Math.sin(t * 6) * 0.1 : s);
    });
    controls.update();
    renderer.render(scene, camera);
  })();

  window.addEventListener("resize", () => {
    camera.aspect = W() / H(); camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
  });
}

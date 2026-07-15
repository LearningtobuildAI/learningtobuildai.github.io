/*
 * Matrix 3D — navigable cross-domain knowledge map (Three.js, vendored locally).
 *   Central AI core + 14 domain platforms in an orbital ring.
 *   Bloom post-processing, holographic platforms, AI-generated icon billboards,
 *   distance-faded labels, cinematic fly-in, click-to-focus info card, legend,
 *   and reset view. Hover highlights; first click focuses; a focused click or
 *   the card button opens that domain's page.
 * Offline: imports Three.js + postprocessing from /website/vendor (import map).
 */
import * as THREE from "three";
import { OrbitControls } from "/website/vendor/OrbitControls.js";
import { EffectComposer } from "/website/vendor/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "/website/vendor/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "/website/vendor/jsm/postprocessing/UnrealBloomPass.js";
import { GLTFLoader } from "/website/vendor/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "/website/vendor/jsm/loaders/DRACOLoader.js";

const DOMAINS = [
  { id: "ai", name: "AI", path: "domain-ai", color: "#38bdf8", gen: "domain-ai" },
  { id: "med", name: "Medicine", path: "domain-med", color: "#22c55e", gen: "domain-med" },
  { id: "nrg", name: "Energy", path: "domain-nrg", color: "#f59e0b", gen: "domain-nrg" },
  { id: "mat", name: "Materials", path: "domain-mat", color: "#a855f7", gen: "domain-mat" },
  { id: "neu", name: "Neuro", path: "domain-neu", color: "#ec4899", gen: "domain-neu" },
  { id: "spc", name: "Space", path: "domain-spc", color: "#60a5fa", gen: "domain-spc" },
  { id: "sec", name: "Security", path: "domain-sec", color: "#f43f5e", gen: "domain-sec" },
  { id: "gov", name: "Governance", path: "domain-gov", color: "#94a3b8", gen: "domain-gov" },
  { id: "bld", name: "Construction", path: "domain-bld", color: "#fb923c", gen: "domain-bld" },
  { id: "cos", name: "Cosmetics", path: "domain-cos", color: "#f472b6", gen: "domain-cos" },
  { id: "smt", name: "Smart Systems", path: "domain-smt", color: "#2dd4bf", gen: "domain-smt" },
  { id: "rob", name: "Robotics", path: "domain-robotics", color: "#818cf8", gen: "domain-robotics" },
  { id: "tdp", name: "3D Printing", path: "domain-3dp", color: "#4ade80", gen: "domain-3dp" },
  { id: "wi", name: "World Intel", path: "worldIntel", color: "#7dd3fc", gen: "world-intel-hero-1782732519795" },
];

function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(120,200,255,0.95)");
  g.addColorStop(0.25, "rgba(70,160,255,0.55)");
  g.addColorStop(0.6, "rgba(40,110,220,0.18)");
  g.addColorStop(1, "rgba(10,30,80,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Glowing HUD frame ring drawn to a canvas, used as an additive sprite behind
// each domain icon so platforms read as holographic panels (and catch bloom).
function makeRingTexture(hex) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  ctx.strokeStyle = hex;
  ctx.shadowColor = hex;
  ctx.shadowBlur = 22;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(128, 128, 104, 0, Math.PI * 2);
  ctx.stroke();
  // Four corner ticks for a targeting-reticle feel.
  ctx.lineWidth = 6;
  for (let i = 0; i < 4; i++) {
    const a = i * (Math.PI / 2) + Math.PI / 4;
    const x1 = 128 + Math.cos(a) * 116;
    const y1 = 128 + Math.sin(a) * 116;
    const x2 = 128 + Math.cos(a) * 128;
    const y2 = 128 + Math.sin(a) * 128;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeLabel(text, hex, scale) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.font = "bold 56px Inter, Segoe UI, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = hex;
  ctx.shadowBlur = 22;
  ctx.fillStyle = "#eef6ff";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  const s = scale || 9.5;
  spr.scale.set(s, s / 4, 1);
  return spr;
}

function loadIcon(loader, d, mat) {
  const urls = ["/images/icons/" + d.id + ".png", "/images/generated/" + d.gen + ".jpg"];
  let i = 0;
  const attempt = () => {
    if (i >= urls.length) return;
    const url = urls[i++];
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        mat.map = tex;
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
      },
      undefined,
      () => attempt(),
    );
  };
  attempt();
}

// ---- Procedural 3D domain emblems (holographic, fully offline) ----
function matSolid(hex, ei) {
  const c = new THREE.Color(hex);
  return new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.22), emissive: c, emissiveIntensity: ei ?? 1.1, metalness: 0.68, roughness: 0.24, envMapIntensity: 0.9 });
}
function matGlass(hex, op) {
  const c = new THREE.Color(hex);
  return new THREE.MeshStandardMaterial({ color: 0x0a1626, emissive: c, emissiveIntensity: 0.6, metalness: 0.35, roughness: 0.12, transparent: true, opacity: op ?? 0.55, envMapIntensity: 1.1 });
}
function matWire(hex, op) {
  return new THREE.MeshBasicMaterial({ color: hex, wireframe: true, transparent: true, opacity: op ?? 0.55 });
}

// Returns a THREE.Group holding a distinct 3D emblem for the given domain.
function buildModel(d, hex) {
  const g = new THREE.Group();
  const add = (m) => { g.add(m); return m; };
  const mesh = (geo, mat) => add(new THREE.Mesh(geo, mat));
  const T = THREE;

  switch (d.id) {
    case "ai": {
      mesh(new T.IcosahedronGeometry(1.6, 1), matSolid(hex, 1.5));
      mesh(new T.IcosahedronGeometry(2.0, 1), matWire(hex, 0.5));
      for (let k = 0; k < 3; k++) {
        const ring = mesh(new T.TorusGeometry(2.6, 0.08, 8, 48), matSolid(hex, 1.6));
        ring.rotation.set(k * 1.0, k * 0.7, k * 0.4);
        const node = mesh(new T.SphereGeometry(0.3, 12, 12), matSolid(hex, 2.2));
        node.position.set(Math.cos(k * 2) * 2.6, Math.sin(k * 2) * 0.6, Math.sin(k * 2) * 2.6);
      }
      break;
    }
    case "med": {
      const strand = matSolid(hex, 1.5);
      for (let k = 0; k < 10; k++) {
        const a = k * 0.6, y = -2.2 + k * 0.48;
        const s1 = mesh(new T.SphereGeometry(0.26, 10, 10), strand);
        s1.position.set(Math.cos(a) * 1.2, y, Math.sin(a) * 1.2);
        const s2 = mesh(new T.SphereGeometry(0.26, 10, 10), strand);
        s2.position.set(Math.cos(a + Math.PI) * 1.2, y, Math.sin(a + Math.PI) * 1.2);
        if (k % 2 === 0) {
          const rung = mesh(new T.CylinderGeometry(0.06, 0.06, 2.4, 6), matSolid(hex, 1.9));
          rung.position.set(0, y, 0);
          rung.rotation.set(0, -a, Math.PI / 2);
        }
      }
      g.scale.setScalar(0.85);
      break;
    }
    case "nrg": {
      mesh(new T.OctahedronGeometry(1.5, 0), matSolid(hex, 1.7));
      const tor = mesh(new T.TorusGeometry(2.4, 0.16, 10, 40), matSolid(hex, 1.3));
      tor.rotation.x = Math.PI / 2;
      const tor2 = mesh(new T.TorusGeometry(1.7, 0.12, 10, 40), matSolid(hex, 1.3));
      tor2.rotation.set(Math.PI / 2, 0, 0.6);
      const bolt = matSolid(hex, 2.4);
      const seg = (x1, y1, x2, y2) => {
        const v1 = new T.Vector3(x1, y1, 0), v2 = new T.Vector3(x2, y2, 0);
        const c = mesh(new T.CylinderGeometry(0.09, 0.09, v1.distanceTo(v2), 6), bolt);
        c.position.copy(v1.clone().add(v2).multiplyScalar(0.5));
        c.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v2.clone().sub(v1).normalize());
      };
      seg(0.4, 1.9, -0.3, 0.3); seg(-0.3, 0.3, 0.4, -0.1); seg(0.4, -0.1, -0.2, -1.9);
      break;
    }
    case "mat": {
      const m = matSolid(hex, 1.2);
      for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
        if (((x + y + z) & 1) !== 0) continue;
        const b = mesh(new T.BoxGeometry(0.62, 0.62, 0.62), m);
        b.position.set(x * 1.3, y * 1.3, z * 1.3);
      }
      mesh(new T.BoxGeometry(2.9, 2.9, 2.9), matWire(hex, 0.45));
      break;
    }
    case "neu": {
      mesh(new T.SphereGeometry(1.8, 16, 12), matGlass(hex, 0.4));
      mesh(new T.SphereGeometry(1.85, 10, 8), matWire(hex, 0.55));
      for (let k = 0; k < 8; k++) {
        const a = k * 0.8;
        const fil = mesh(new T.CylinderGeometry(0.05, 0.05, 1.2, 6), matSolid(hex, 1.8));
        fil.position.set(Math.cos(a) * 1.8, Math.sin(a * 1.3) * 1.2, Math.sin(a) * 1.8);
        fil.lookAt(0, 0, 0);
        const tip = mesh(new T.SphereGeometry(0.22, 8, 8), matSolid(hex, 2.2));
        tip.position.copy(fil.position).multiplyScalar(1.35);
      }
      break;
    }
    case "spc": {
      mesh(new T.CylinderGeometry(0.5, 0.5, 2.4, 16), matSolid(hex, 0.9));
      const nose = mesh(new T.ConeGeometry(0.5, 1, 16), matSolid(hex, 1.4)); nose.position.y = 1.7;
      const flame = mesh(new T.ConeGeometry(0.42, 0.9, 12), matSolid(hex, 2.4)); flame.position.y = -1.6; flame.rotation.x = Math.PI;
      for (let k = 0; k < 3; k++) {
        const a = k * (Math.PI * 2 / 3);
        const fin = mesh(new T.BoxGeometry(0.1, 0.7, 0.5), matSolid(hex, 1.1));
        fin.position.set(Math.cos(a) * 0.55, -1, Math.sin(a) * 0.55);
      }
      const orbit = mesh(new T.TorusGeometry(2.6, 0.05, 8, 48), matSolid(hex, 1.3)); orbit.rotation.x = Math.PI / 2.4;
      const sat = mesh(new T.BoxGeometry(0.4, 0.4, 0.4), matSolid(hex, 2.2)); sat.position.set(2.6, 0, 0);
      break;
    }
    case "sec": {
      const shield = mesh(new T.OctahedronGeometry(1.9, 0), matGlass(hex, 0.5)); shield.scale.set(0.8, 1.15, 0.25);
      const shieldW = mesh(new T.OctahedronGeometry(1.95, 0), matWire(hex, 0.55)); shieldW.scale.set(0.8, 1.15, 0.25);
      mesh(new T.BoxGeometry(0.8, 0.6, 0.35), matSolid(hex, 1.9));
      const shackle = mesh(new T.TorusGeometry(0.32, 0.08, 8, 16, Math.PI), matSolid(hex, 1.9)); shackle.position.y = 0.42;
      break;
    }
    case "gov": {
      const dome = mesh(new T.SphereGeometry(1.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), matSolid(hex, 1.0)); dome.position.y = 0.2;
      const domeW = mesh(new T.SphereGeometry(1.55, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), matWire(hex, 0.5)); domeW.position.y = 0.2;
      const base = mesh(new T.BoxGeometry(3.4, 0.4, 3.4), matSolid(hex, 0.8)); base.position.y = -0.9;
      for (let k = 0; k < 6; k++) {
        const a = k * (Math.PI * 2 / 6);
        const col = mesh(new T.CylinderGeometry(0.16, 0.16, 1.2, 10), matSolid(hex, 1.0));
        col.position.set(Math.cos(a) * 1.4, -0.3, Math.sin(a) * 1.4);
      }
      const spire = mesh(new T.ConeGeometry(0.18, 0.6, 10), matSolid(hex, 1.6)); spire.position.y = 1.7;
      break;
    }
    case "bld": {
      mesh(new T.BoxGeometry(0.35, 3.4, 0.35), matSolid(hex, 1.0));
      const jib = mesh(new T.BoxGeometry(3.6, 0.25, 0.25), matSolid(hex, 1.2)); jib.position.set(0.9, 1.5, 0);
      const counter = mesh(new T.BoxGeometry(0.5, 0.4, 0.5), matSolid(hex, 1.4)); counter.position.set(-1.0, 1.5, 0);
      const cable = mesh(new T.CylinderGeometry(0.03, 0.03, 1.4, 6), matSolid(hex, 1.0)); cable.position.set(2.2, 0.8, 0);
      const hook = mesh(new T.BoxGeometry(0.35, 0.35, 0.35), matSolid(hex, 1.9)); hook.position.set(2.2, 0.0, 0);
      const foot = mesh(new T.BoxGeometry(0.9, 0.3, 0.9), matSolid(hex, 0.9)); foot.position.y = -1.75;
      break;
    }
    case "cos": {
      mesh(new T.CylinderGeometry(0.8, 0.8, 2, 20), matGlass(hex, 0.55));
      const neck = mesh(new T.CylinderGeometry(0.35, 0.5, 0.5, 16), matGlass(hex, 0.6)); neck.position.y = 1.25;
      const cap = mesh(new T.CylinderGeometry(0.42, 0.42, 0.5, 16), matSolid(hex, 1.5)); cap.position.y = 1.7;
      for (let k = 0; k < 5; k++) {
        const a = k * 1.25;
        const mol = mesh(new T.SphereGeometry(0.22, 10, 10), matSolid(hex, 2.2));
        mol.position.set(Math.cos(a) * 2.3, Math.sin(a * 1.5) * 1.2, Math.sin(a) * 2.3);
      }
      break;
    }
    case "smt": {
      mesh(new T.IcosahedronGeometry(1.1, 0), matSolid(hex, 1.7));
      for (let k = 1; k <= 3; k++) {
        const t = mesh(new T.TorusGeometry(0.9 + k * 0.7, 0.05, 8, 48), matSolid(hex, 1.4 - k * 0.2));
        t.rotation.x = Math.PI / 2;
      }
      for (let k = 0; k < 4; k++) {
        const a = k * (Math.PI / 2);
        const n = mesh(new T.SphereGeometry(0.25, 10, 10), matSolid(hex, 2.2));
        n.position.set(Math.cos(a) * 2.9, 0, Math.sin(a) * 2.9);
      }
      break;
    }
    case "rob": {
      const base = mesh(new T.CylinderGeometry(0.7, 0.9, 0.5, 20), matSolid(hex, 1.0)); base.position.y = -1.8;
      const j1 = mesh(new T.SphereGeometry(0.45, 14, 14), matSolid(hex, 1.6)); j1.position.y = -1.4;
      const s1 = mesh(new T.BoxGeometry(0.4, 1.6, 0.4), matSolid(hex, 1.1)); s1.position.set(0, -0.5, 0);
      const j2 = mesh(new T.SphereGeometry(0.4, 14, 14), matSolid(hex, 1.6)); j2.position.set(0, 0.4, 0);
      const s2 = mesh(new T.BoxGeometry(0.35, 1.4, 0.35), matSolid(hex, 1.1)); s2.position.set(0.5, 1.1, 0); s2.rotation.z = -0.7;
      const grip = mesh(new T.ConeGeometry(0.3, 0.6, 10), matSolid(hex, 1.9)); grip.position.set(1.1, 1.7, 0); grip.rotation.z = -1.2;
      break;
    }
    case "tdp": {
      const fm = matSolid(hex, 1.0);
      const post = (x, z) => { const p = mesh(new T.CylinderGeometry(0.08, 0.08, 3, 8), fm); p.position.set(x, 0, z); };
      post(-1.4, -1.4); post(1.4, -1.4); post(-1.4, 1.4); post(1.4, 1.4);
      const top = mesh(new T.BoxGeometry(3, 0.15, 3), fm); top.position.y = 1.5;
      const bed = mesh(new T.BoxGeometry(3, 0.15, 3), fm); bed.position.y = -1.5;
      const nozzle = mesh(new T.ConeGeometry(0.2, 0.5, 10), matSolid(hex, 2.2)); nozzle.position.set(0, 0.9, 0); nozzle.rotation.x = Math.PI;
      for (let y = 0; y < 4; y++) for (let x = -1; x <= 1; x++) {
        const b = mesh(new T.BoxGeometry(0.35, 0.3, 0.35), matSolid(hex, 1.5));
        b.position.set(x * 0.7, -1.2 + y * 0.32, (y % 2 ? 0.4 : -0.4));
      }
      break;
    }
    case "wi": {
      mesh(new T.SphereGeometry(1.8, 24, 16), matGlass(hex, 0.4));
      mesh(new T.SphereGeometry(1.83, 18, 12), matWire(hex, 0.5));
      const ring = mesh(new T.TorusGeometry(2.5, 0.06, 8, 64), matSolid(hex, 1.4)); ring.rotation.x = Math.PI / 2.6;
      for (let k = 0; k < 6; k++) {
        const a = k * (Math.PI / 3);
        const ds = mesh(new T.SphereGeometry(0.12, 8, 8), matSolid(hex, 2.2));
        ds.position.set(Math.cos(a) * 2.5 * Math.cos(0.4), Math.sin(a) * 2.5 * 0.4, Math.sin(a) * 2.5 * Math.cos(0.4));
      }
      break;
    }
    default:
      mesh(new T.IcosahedronGeometry(1.7, 1), matSolid(hex, 1.4));
      mesh(new T.IcosahedronGeometry(2.0, 0), matWire(hex, 0.5));
  }
  return g;
}

function makeRadialTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.4, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Per-domain particle aura: a small additive point cloud orbiting the model.
function makeAura(hexColor, texture) {
  const n = 20;
  const geo = new THREE.BufferGeometry();
  const arr = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    const rr = 2.6 + Math.random() * 2.3;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    arr[k * 3] = Math.sin(ph) * Math.cos(th) * rr;
    arr[k * 3 + 1] = Math.cos(ph) * rr * 0.7;
    arr[k * 3 + 2] = Math.sin(ph) * Math.sin(th) * rr;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({ color: new THREE.Color(hexColor), map: texture || null, size: 0.55, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
  return new THREE.Points(geo, mat);
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
}

// Deep-space nebula skybox (equirectangular CanvasTexture) — fully offline.
function makeNebulaTexture() {
  const W = 2048, H = 1024;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#01020a");
  bg.addColorStop(0.5, "#02040d");
  bg.addColorStop(1, "#01030b");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const blobs = [["#3b2a6b", 0.16], ["#1f4d7a", 0.14], ["#5a2b5e", 0.11], ["#12507a", 0.12], ["#2a1f5e", 0.13]];
  for (let k = 0; k < 26; k++) {
    const b = blobs[k % blobs.length];
    const x = Math.random() * W, y = Math.random() * H;
    const r = 120 + Math.random() * 340;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(b[0], b[1]));
    g.addColorStop(1, hexA(b[0], 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = "lighter";
  for (let k = 0; k < 1600; k++) {
    const x = Math.random() * W, y = Math.random() * H;
    const a = Math.random();
    const sz = a > 0.965 ? 2 : 1;
    ctx.fillStyle = "rgba(" + (200 + (Math.random() * 55 | 0)) + "," + (210 + (Math.random() * 45 | 0)) + ",255," + (0.22 + a * 0.6).toFixed(2) + ")";
    ctx.fillRect(x, y, sz, sz);
  }
  ctx.globalCompositeOperation = "source-over";
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function init() {
  const host = document.getElementById("matrix3d");
  if (!host) return;
  const stage = host.closest(".mx3d-stage") || host.parentElement;

  const gl = document.createElement("canvas").getContext("webgl2") || document.createElement("canvas").getContext("webgl");
  if (!gl) {
    host.innerHTML = '<div class="mx3d-fallback">3D view requires WebGL, which is unavailable in this browser. The interactive graph above remains fully functional.</div>';
    return;
  }

  const H = 560;
  let W = host.clientWidth || 900;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x040910, 0.0016);

  const DEFAULT_CAM = new THREE.Vector3(0, 48, 70);
  const DEFAULT_TARGET = new THREE.Vector3(0, 4, 0);

  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 2000);
  camera.position.set(0, 130, 165); // fly-in start

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.setClearColor(0x04070f, 1);
  host.appendChild(renderer.domElement);

  // Prefiltered environment (PMREM) from a procedural gradient so the metallic
  // platforms and 3D models pick up soft studio-style reflections.
  const envCanvas = document.createElement("canvas");
  envCanvas.width = 32; envCanvas.height = 256;
  const ectx = envCanvas.getContext("2d");
  const eg = ectx.createLinearGradient(0, 0, 0, 256);
  eg.addColorStop(0.0, "#12335c");
  eg.addColorStop(0.42, "#0a1c33");
  eg.addColorStop(0.6, "#050a16");
  eg.addColorStop(1.0, "#01030a");
  ectx.fillStyle = eg;
  ectx.fillRect(0, 0, 32, 256);
  // A couple of bright bands read as soft key lights in reflections.
  ectx.fillStyle = "rgba(120,190,255,0.55)";
  ectx.fillRect(0, 40, 32, 10);
  ectx.fillStyle = "rgba(80,140,230,0.30)";
  ectx.fillRect(0, 150, 32, 8);
  const envEquirect = new THREE.CanvasTexture(envCanvas);
  envEquirect.mapping = THREE.EquirectangularReflectionMapping;
  envEquirect.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromEquirectangular(envEquirect).texture;
  scene.environment = envMap;
  envEquirect.dispose();
  pmrem.dispose();

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 1.05, 0.5, 0.8);
  composer.addPass(bloom);
  composer.setSize(W, H);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 32;
  controls.maxDistance = 130;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.enablePan = false;
  controls.enableZoom = false; // the mouse wheel spins the domain ring instead
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.4;
  controls.target.copy(DEFAULT_TARGET);

  // Brighter, more neutral fill so the baked domain models read as dimensional
  // 3D (the old dim cool-blue ambient crushed the darker models to flat blobs).
  scene.add(new THREE.AmbientLight(0x6a7f96, 1.4));
  const key = new THREE.PointLight(0x9fd4ff, 2.1, 380);
  key.position.set(0, 52, 0);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x88aaff, 0.6);
  rim.position.set(40, 30, 20);
  scene.add(rim);

  // Deep-space backdrop: a procedural nebula skybox (equirectangular).
  scene.background = makeNebulaTexture();
  scene.background.mapping = THREE.EquirectangularReflectionMapping;

  // Layered starfield on a large shell: tinted, additive, unaffected by fog.
  const starGeo = new THREE.BufferGeometry();
  const cnt = 1400;
  const pos = new Float32Array(cnt * 3);
  const col = new Float32Array(cnt * 3);
  const tmpStar = new THREE.Color();
  for (let i = 0; i < cnt; i++) {
    const rr = 520 + Math.random() * 380;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = Math.sin(ph) * Math.cos(th) * rr;
    pos[i * 3 + 1] = Math.cos(ph) * rr;
    pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * rr;
    tmpStar.setHSL(0.55 + (Math.random() - 0.5) * 0.14, 0.5, 0.6 + Math.random() * 0.35);
    col[i * 3] = tmpStar.r; col[i * 3 + 1] = tmpStar.g; col[i * 3 + 2] = tmpStar.b;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 2.2, map: makeRadialTexture(), vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false })));

  const R = 36;

  // Distant sun: directional key light + additive glow sprite (drives the terminator).
  const sunDir = new THREE.Vector3(-0.55, 0.32, 0.77).normalize();
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
  sun.position.copy(sunDir.clone().multiplyScalar(400));
  scene.add(sun);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeRadialTexture(), color: 0xffe9c2, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sunGlow.scale.set(70, 70, 1);
  sunGlow.position.copy(sunDir.clone().multiplyScalar(560));
  scene.add(sunGlow);

  // Photoreal Earth billboard below the ring (pre-rendered globe asset, offline).
  // Uses a supplied transparent PNG instead of a per-pixel procedural texture
  // (the procedural version blocked the main thread on load and could freeze the tab).
  const earthSize = 360;
  const earthBaseY = -earthSize * 0.52;
  const earth = new THREE.Group();
  const earthGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeRadialTexture(), color: 0x3f7bff, transparent: true, opacity: 0.5, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false }));
  earthGlow.scale.set(earthSize * 1.24, earthSize * 1.24, 1);
  earthGlow.renderOrder = -2;
  earth.add(earthGlow);
  const earthSprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, depthWrite: false, fog: false }));
  earthSprite.scale.set(earthSize, earthSize, 1);
  earthSprite.renderOrder = -1;
  earth.add(earthSprite);
  new THREE.TextureLoader().load("/images/earth-globe.png", (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    earthSprite.material.map = tex;
    earthSprite.material.needsUpdate = true;
  });
  earth.position.set(0, earthBaseY, 0);
  scene.add(earth);

  // Central AI core.
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(5.4, 2),
    new THREE.MeshStandardMaterial({ color: 0x0b1224, emissive: 0x1e90ff, emissiveIntensity: 1.6, metalness: 0.75, roughness: 0.15, envMapIntensity: 1.3 }),
  );
  core.position.y = 5;
  scene.add(core);
  const coreWire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(6.3, 1),
    new THREE.MeshBasicMaterial({ color: 0x7dd3fc, wireframe: true, transparent: true, opacity: 0.35 }),
  );
  coreWire.position.y = 5;
  scene.add(coreWire);
  const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture(), color: 0x3fbaff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  coreGlow.scale.set(34, 34, 1);
  coreGlow.position.y = 5;
  scene.add(coreGlow);
  const coreLabel = makeLabel("AI CORE", "#38bdf8", 13);
  coreLabel.position.set(0, 15, 0);
  scene.add(coreLabel);

  const loader = new THREE.TextureLoader();
  const gltfLoader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/website/vendor/jsm/libs/draco/gltf/");
  gltfLoader.setDRACOLoader(dracoLoader);
  const RADIAL = makeRadialTexture();
  const nodes = [];
  const nodeById = {};
  const pulses = [];

  // Scale + center any loaded object so its largest dimension == targetSize,
  // pivoting about its own centre so it sits neatly on the platform.
  function fitModel(obj, targetSize) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = targetSize / maxDim;
    obj.scale.setScalar(s);
    obj.position.sub(center.multiplyScalar(s));
  }

  // Upgrade a domain's procedural emblem to a real GLB model when one exists at
  // /website/models/<id>.glb. Missing file -> keep the procedural emblem silently.
  function loadDomainGLB(d, holder, emblem) {
    const url = "/website/models/" + d.id + ".glb?v=20260703w";
    fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((buf) => {
        if (!buf) return; // no asset supplied yet
        gltfLoader.parse(buf, "/website/models/", (gltf) => {
          const obj = gltf.scene || gltf.scenes[0];
          fitModel(obj, 9.2);
          obj.traverse((o) => {
            if (o.isMesh && o.material) {
              // Stronger env reflections so metallic/PBR domain models read as 3D
              // (was 1.0 = several models looked dark/flat). Lift baked-in AO
              // darkening so shapes aren't crushed to muddy blobs.
              o.material.envMapIntensity = 1.9;
              if (o.material.aoMapIntensity !== undefined) o.material.aoMapIntensity = 0.5;
              o.material.needsUpdate = true;
              o.castShadow = false; o.receiveShadow = false;
            }
          });
          holder.remove(emblem);
          holder.add(obj);
        }, (err) => { console.warn("[matrix-3d] GLB parse failed for " + d.id, err); });
      })
      .catch(() => {});
  }

  // Rotating hub: holds every domain platform + its connection line so the
  // whole ring spins together when the user scrolls the mouse wheel.
  const hub = new THREE.Group();
  scene.add(hub);

  DOMAINS.forEach((d, i) => {
    const a = (i / DOMAINS.length) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * R;
    const z = Math.sin(a) * R;
    const hex = new THREE.Color(d.color);
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 5.6, 0.7, 56),
      new THREE.MeshStandardMaterial({ color: 0x0a1120, emissive: hex, emissiveIntensity: 0.32, metalness: 0.9, roughness: 0.2, envMapIntensity: 1.1 }),
    );
    group.add(disc);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(5.2, 6.1, 56),
      new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.42;
    group.add(ring);

    // The 4K icon laid flat on the platform surface (faces up).
    const iconMat = new THREE.MeshBasicMaterial({ transparent: true, color: hex, side: THREE.DoubleSide, depthWrite: false });
    const iconDisc = new THREE.Mesh(new THREE.CircleGeometry(4.4, 48), iconMat);
    iconDisc.rotation.x = -Math.PI / 2;
    iconDisc.position.y = 0.43;
    group.add(iconDisc);
    loadIcon(loader, d, iconMat);

    // The floating, spinning 3D domain model. A holder Group is animated so the
    // asset can be swapped at runtime: a procedural emblem now, a photoreal GLB
    // model automatically if /website/models/<id>.glb is present.
    const model = new THREE.Group();
    model.position.y = 7.6;
    const emblem = buildModel(d, d.color);
    model.add(emblem);
    group.add(model);

    // Invisible billboarded hit-proxy (kept for raycasting + HUD frame).
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    plane.position.y = 7.6;
    group.add(plane);

    // Glowing HUD reticle around the model (child of the billboard so it faces the camera).
    const frame = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeRingTexture(d.color), transparent: true, opacity: 0.9, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    frame.scale.set(11, 11, 1);
    plane.add(frame);

    const label = makeLabel(d.name, d.color);
    label.position.y = 14;
    group.add(label);

    // Contact-shadow glow pad on the floor beneath the platform (grounding).
    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 15),
      new THREE.MeshBasicMaterial({ map: RADIAL, color: hex, transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = -0.34;
    group.add(pad);

    // Per-domain particle aura around the floating model.
    const aura = makeAura(d.color, RADIAL);
    aura.position.y = 7.6;
    group.add(aura);

    // Curved (bezier) connection: core -> node, arcing upward (parented to hub).
    const cStart = new THREE.Vector3(0, 4.5, 0);
    const cEnd = new THREE.Vector3(x, 1.6, z);
    const cMid = cStart.clone().lerp(cEnd, 0.5);
    cMid.y += 7.5;
    const curve = new THREE.QuadraticBezierCurve3(cStart, cMid, cEnd);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(46));
    hub.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: 0.5 })));

    // Energy pulse traveling along the connection.
    const pulse = new THREE.Sprite(new THREE.SpriteMaterial({ map: RADIAL, color: hex, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    pulse.scale.set(2.8, 2.8, 1);
    hub.add(pulse);
    pulses.push({ curve, sprite: pulse, offset: i / DOMAINS.length });

    group.userData = { domain: d, plane, ring, disc, model, emblem, label, aura, baseY: 7.6, phase: i };
    hub.add(group);
    nodes.push(group);
    nodeById[d.id] = group;
  });

  // Manifest-gated model upgrade: only fetch GLBs whose slot is marked present,
  // so absent assets never hit the network (no 404s). Flip "present": true in
  // website/models/manifest.json once a <id>.glb is dropped in.
  fetch("/website/models/manifest.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((m) => {
      if (!m || !Array.isArray(m.slots)) return;
      m.slots.forEach((s) => {
        if (!s || !s.present) return;
        const g = nodeById[s.id];
        const d = DOMAINS.find((x) => x.id === s.id);
        if (g && d) loadDomainGLB(d, g.userData.model, g.userData.emblem);
      });
    })
    .catch(() => {});

  // ---- HUD overlays (legend, info card, reset) ----
  const tag = document.getElementById("matrix3dTag");

  const legend = document.createElement("div");
  legend.className = "mx3d-legend";
  DOMAINS.forEach((d) => {
    const chip = document.createElement("button");
    chip.className = "mx3d-chip";
    chip.dataset.id = d.id;
    chip.innerHTML = '<span class="mx3d-chip-dot" style="background:' + d.color + '"></span>' + d.name;
    chip.addEventListener("click", () => {
      const n = nodeById[d.id];
      if (n) focusNode(n);
    });
    legend.appendChild(chip);
  });
  stage.appendChild(legend);
  const setLegendActive = (id) => {
    legend.querySelectorAll(".mx3d-chip").forEach((c) => c.classList.toggle("active", c.dataset.id === id));
  };

  const card = document.createElement("div");
  card.className = "mx3d-card";
  card.innerHTML =
    '<button class="mx3d-card-x" aria-label="Close">\u00d7</button>' +
    '<img class="mx3d-card-img" alt="" />' +
    '<div class="mx3d-card-body"><div class="mx3d-card-name"></div>' +
    '<a class="mx3d-card-open">Open intelligence \u2192</a></div>';
  stage.appendChild(card);
  card.querySelector(".mx3d-card-x").addEventListener("click", resetView);

  const resetBtn = document.createElement("button");
  resetBtn.className = "mx3d-reset";
  resetBtn.textContent = "Reset View";
  resetBtn.addEventListener("click", resetView);
  stage.appendChild(resetBtn);

  function showCard(d) {
    card.querySelector(".mx3d-card-img").src = "/images/icons/" + d.id + ".png";
    card.querySelector(".mx3d-card-name").textContent = d.name;
    card.querySelector(".mx3d-card-open").href = "/website/sections/" + d.path + "/index.html";
    card.classList.add("show");
  }
  function hideCard() {
    card.classList.remove("show");
  }

  // ---- Camera tween ----
  let camTween = null;
  function tweenTo(posVec, targetVec, autoRotateOnEnd) {
    camTween = { pos: posVec.clone(), target: targetVec.clone(), autoRotateOnEnd: !!autoRotateOnEnd };
    controls.autoRotate = false;
  }

  let focused = null;
  function focusNode(node) {
    focused = node;
    const p = new THREE.Vector3();
    node.getWorldPosition(p);
    const dir = new THREE.Vector3(p.x, 0, p.z).normalize();
    const camPos = new THREE.Vector3(p.x + dir.x * 22, 22, p.z + dir.z * 22);
    tweenTo(camPos, new THREE.Vector3(p.x, 7, p.z), false);
    showCard(node.userData.domain);
    setLegendActive(node.userData.domain.id);
  }
  function resetView() {
    focused = null;
    hideCard();
    setLegendActive(null);
    tweenTo(DEFAULT_CAM, DEFAULT_TARGET, true);
  }

  // ---- Interaction ----
  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-2, -2);
  let hovered = null;
  const rect = () => renderer.domElement.getBoundingClientRect();

  renderer.domElement.addEventListener("pointermove", (e) => {
    const r = rect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  });
  renderer.domElement.addEventListener("pointerleave", () => mouse.set(-2, -2));
  renderer.domElement.addEventListener("click", () => {
    if (!hovered) return;
    if (focused === hovered) {
      window.location.href = "/website/sections/" + hovered.userData.domain.path + "/index.html";
    } else {
      focusNode(hovered);
    }
  });

  // Mouse wheel spins the whole domain ring (with inertia) instead of zooming.
  let spinVel = 0;
  renderer.domElement.addEventListener("wheel", (e) => {
    e.preventDefault();
    spinVel += e.deltaY * 0.00045;
    spinVel = THREE.MathUtils.clamp(spinVel, -0.14, 0.14);
  }, { passive: false });

  // Soft hover audio cue (WebAudio; started on first interaction per autoplay policy).
  let audioCtx = null;
  function ensureAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    } catch (e) { audioCtx = null; }
  }
  function blip() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(520, now);
    o.frequency.exponentialRampToValueAtTime(760, now + 0.08);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(now); o.stop(now + 0.14);
  }
  renderer.domElement.addEventListener("pointerdown", ensureAudio);

  const clock = new THREE.Clock();
  const wp = new THREE.Vector3();
  const wp2 = new THREE.Vector3();
  const camDirH = new THREE.Vector3();
  const nodeDirH = new THREE.Vector3();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    const pulse = 1 + Math.sin(t * 1.6) * 0.05;
    core.scale.setScalar(pulse);
    coreGlow.scale.setScalar(34 * (1 + Math.sin(t * 1.6) * 0.05));
    core.rotation.y += 0.004;
    coreWire.rotation.y -= 0.003;
    coreWire.rotation.x += 0.0012;
    earth.position.y = earthBaseY + Math.sin(t * 0.12) * 3;

    // Ring spin: wheel-driven inertia + a slow ambient drift; frozen while focused.
    if (!focused) {
      hub.rotation.y += spinVel + 0.0008;
    }
    spinVel *= 0.92;

    nodes.forEach((g) => {
      const u = g.userData;
      const bob = Math.sin(t * 1.2 + u.phase) * 0.5;
      u.plane.lookAt(camera.position);
      u.plane.position.y = u.baseY + bob;
      u.model.position.y = u.baseY + bob;
      u.model.rotation.y += 0.012;
      u.ring.rotation.z += 0.01;

      const active = g === hovered || g === focused;
      u.plane.material.needsUpdate = false;
      const targetLift = active ? 2.6 : 0;
      g.position.y += (targetLift - g.position.y) * 0.14;
      const targetScale = active ? 1.1 : 1;
      const cs = g.scale.x + (targetScale - g.scale.x) * 0.14;
      g.scale.setScalar(cs);

      u.aura.rotation.y += 0.004;
      u.aura.material.opacity += ((active ? 0.95 : 0.5) - u.aura.material.opacity) * 0.1;

      g.getWorldPosition(wp);
      const camDist = camera.position.distanceTo(wp);
      let op = THREE.MathUtils.clamp(1.25 - (camDist - 44) / 90, 0.12, 1);
      if (focused && focused !== g) op *= 0.3;
      // De-clutter edge-on: fade far-side (back) labels harder.
      camDirH.set(camera.position.x, 0, camera.position.z);
      if (camDirH.lengthSq() > 1e-4) camDirH.normalize();
      nodeDirH.set(wp.x, 0, wp.z);
      if (nodeDirH.lengthSq() > 1e-4) nodeDirH.normalize();
      op *= 1 - Math.max(0, -nodeDirH.dot(camDirH)) * 0.82;
      u.label.material.opacity = op;
    });

    // Energy pulses traveling along the connections.
    for (const p of pulses) {
      const pu = (t * 0.22 + p.offset) % 1;
      p.curve.getPoint(pu, wp2);
      p.sprite.position.copy(wp2);
      p.sprite.material.opacity = 0.22 + 0.6 * Math.sin(pu * Math.PI);
    }

    if (camTween) {
      camera.position.lerp(camTween.pos, 0.06);
      controls.target.lerp(camTween.target, 0.09);
      if (camera.position.distanceTo(camTween.pos) < 1.4) {
        if (camTween.autoRotateOnEnd) controls.autoRotate = true;
        camTween = null;
      }
    }

    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects(nodes.map((n) => n.userData.plane));
    const next = hits.length ? nodes.find((n) => n.userData.plane === hits[0].object) : null;
    if (next !== hovered) {
      hovered = next;
      renderer.domElement.style.cursor = hovered ? "pointer" : "grab";
      if (hovered) blip();
      if (tag) {
        if (hovered) {
          tag.textContent = hovered.userData.domain.name;
          tag.style.opacity = "1";
        } else {
          tag.style.opacity = "0";
        }
      }
    }

    controls.update();
    composer.render();
  }
  animate();

  // Cinematic fly-in.
  tweenTo(DEFAULT_CAM, DEFAULT_TARGET, true);

  window.addEventListener("resize", () => {
    W = host.clientWidth || W;
    renderer.setSize(W, H);
    composer.setSize(W, H);
    bloom.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

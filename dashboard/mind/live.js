// live.js — the map reacts to the OS actually doing something. A spectator:
// read-only EventSource, backoff reconnect, closed while the tab is hidden.
// No fake pulses: an unresolvable id drops the animation silently.
import * as THREE from "three";
import {
  scene, camera, controls, uTime, onFrame, membrane,
  regionGroups, beadMeshes, agentMeshes, coreGroup, skeleton, positions, curves,
} from "./scene.js";
import { GRADIENT } from "./nodes.js";
import { ANCHORS, hash01 } from "./regions.js";

// ---------- resolve node -> (position, flare handle) ----------
const beadIndex = new Map();       // nodeId -> {mesh, i}
for (const mesh of beadMeshes)
  mesh.userData.ids.forEach((id, i) => beadIndex.set(id, { mesh, i }));
const agentIndex = new Map(agentMeshes.map((m) => [m.userData.nodeId, m]));
const bloomed = new Map();         // ids born after page load -> standalone sphere

function posOf(id) {
  if (id === "core") return [0, 0, 0];
  if (positions.has(id)) return positions.get(id);
  const b = bloomed.get(id);
  return b ? b.position.toArray() : null;
}

// ---------- flares: temporary ×2.2 scale on an instanced bead ----------
const flares = new Map();          // nodeId -> t0
const M4 = new THREE.Matrix4(), V3 = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
function flare(id) {
  if (beadIndex.has(id) || bloomed.has(id)) flares.set(id, uTime.value);
}
onFrame.push(() => {
  for (const [id, t0] of flares) {
    const k = (uTime.value - t0) / 1.0;                       // 1s envelope
    const s = k >= 1 ? 1 : 1 + 1.2 * (1 - k);
    const hit = beadIndex.get(id);
    if (hit) {
      hit.mesh.getMatrixAt(hit.i, M4);
      M4.decompose(V3, Q, S);
      const base = S.x / (hit.mesh.userData.flare?.[id] || 1); // undo previous flare
      M4.compose(V3, Q, new THREE.Vector3(base * s, base * s, base * s));
      hit.mesh.setMatrixAt(hit.i, M4);
      (hit.mesh.userData.flare ??= {})[id] = s;
      hit.mesh.instanceMatrix.needsUpdate = true;
    } else if (bloomed.has(id)) bloomed.get(id).scale.setScalar(0.16 * s);
    if (k >= 1) flares.delete(id);
  }
});

// ---------- pooled pulse system: 64 preallocated additive sprites ----------
const POOL = 64;
const pool = [];
for (let i = 0; i < POOL; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GRADIENT, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending }));
  s.visible = false;
  scene.add(s);
  pool.push({ sprite: s, busy: false });
}
const LINE = new THREE.LineCurve3(new THREE.Vector3(), new THREE.Vector3());

export function fire(fromId, toId, color = 0x67e8f9, opts = {}) {
  const a = posOf(fromId), b = posOf(toId);
  if (!a || !b) return;                                       // the no-fake-pulses rule
  const slot = pool.find((p) => !p.busy);
  if (!slot) return;
  let curve = curves.get(`${fromId}|${toId}`)?.curve;
  let rev = false;
  if (!curve) { curve = curves.get(`${toId}|${fromId}`)?.curve; rev = !!curve; }
  if (!curve) {                                               // ephemeral straight fallback
    curve = new THREE.LineCurve3(new THREE.Vector3(...a), new THREE.Vector3(...b));
  }
  slot.busy = true;
  const sp = slot.sprite;
  sp.material.color.set(color);
  sp.visible = true;
  const dur = opts.duration ?? 1.1, scale = opts.scale ?? 1, t0 = uTime.value;
  const tick = () => {
    const k = (uTime.value - t0) / dur;
    if (k >= 1) {
      sp.visible = false; sp.material.opacity = 0; slot.busy = false;
      onFrame.splice(onFrame.indexOf(tick), 1);
      return;
    }
    const t = rev ? 1 - k : k;
    curve.getPoint(t, V3);
    sp.position.copy(V3);
    const swell = Math.sin(k * Math.PI);                      // swells at mid-flight
    sp.scale.setScalar((0.5 + swell * 0.9) * scale);
    sp.material.opacity = (0.25 + swell * 0.65) * (opts.opacity ?? 1);
  };
  onFrame.push(tick);
}

// ---------- reactions ----------
function newBloom(id, label) {
  if (beadIndex.has(id) || bloomed.has(id)) return;
  // honest handling: InstancedMesh can't grow, so a fresh node is a standalone sphere
  const p = ANCHORS.memory, u = hash01(id) * Math.PI * 2, v = hash01(id + "v") * 2 - 1;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false }));
  mesh.position.set(p[0] + 3 * Math.cos(u), p[1] + 2 * v, p[2] + 3 * Math.sin(u));
  mesh.scale.setScalar(0.001);
  mesh.userData.nodeId = id;
  regionGroups.memory.add(mesh);
  bloomed.set(id, mesh);
  const t0 = uTime.value;
  const grow = () => {
    const k = Math.min(1, (uTime.value - t0) / 0.8);
    mesh.scale.setScalar(0.16 * k);
    if (k >= 1) onFrame.splice(onFrame.indexOf(grow), 1);
  };
  onFrame.push(grow);
}

const agentHot = new Map();        // slug -> expiry
function ripple() {
  const t0 = uTime.value;
  const sweep = () => {
    const k = (uTime.value - t0) / 2;
    if (k >= 1) { membrane.uniforms.uOpacity.value = 0.06; onFrame.splice(onFrame.indexOf(sweep), 1); return; }
    membrane.uniforms.uOpacity.value = 0.06 + 0.16 * Math.sin(k * Math.PI);
  };
  onFrame.push(sweep);
}

// ---------- persona: the mind's colour is the active persona's colour ----------
// "Design like Ultron" made real rather than cosmetic: the core star and the
// membrane retarget to whichever persona is active, live, on the same signal
// the deck uses. Same-origin fetch — the dashboard serves both pages.
function applyPersonaColor(hex) {
  if (!hex) return;
  coreGroup?.userData.setColor?.(hex);
  if (membrane) membrane.uniforms.uColor.value.set(hex);
  // 2D chrome (HUD frame, search, tooltip, inspector) reads the same signal
  // via CSS custom properties, so the whole page shifts as one — not just the
  // 3D star. Region/legend colours are untouched: those encode data (memory =
  // violet, knowledge = amber), not persona, and must never be retinted.
  const css = "#" + hex.replace("#", "");
  document.documentElement.style.setProperty("--accent", css);
  document.documentElement.style.setProperty("--accent-2", css);
}
fetch("/api/personas").then((r) => r.json()).then((d) => {
  const p = d.personas?.[d.active];
  if (p?.accent) applyPersonaColor(p.accent);
}).catch(() => {});   // chrome-only sync; a failed fetch leaves the brand default, never breaks the page

export const liveHandlers = {
  onRecall(memId) {                       // watch it remember
    const id = memId.includes(":") ? memId : "mem:" + memId;
    fire(id, "core", 0xa78bfa);
    flare(id);
  },
  onWrite(memId) {
    const id = memId.includes(":") ? memId : "mem:" + memId;
    newBloom(id);
    const w = skeleton.nodes.find((n) => n.region === "working");
    if (w) fire(w.id, id, 0x67e8f9);
  },
  onDispatch(slug) {                      // watch it delegate
    const id = slug.includes(":") ? slug : "agent:" + slug;
    fire("core", id, 0xe88fb3);
    const m = agentIndex.get(id);
    if (m) { m.userData.boost.value = 2.0; agentHot.set(id, uTime.value + 30); }
  },
  onTurn() {                              // the star and its ring flare as one organism
    const t0 = uTime.value, ring = coreGroup.userData.dynamicRing, nuc = coreGroup.userData.nucleus;
    const env = () => {
      const k = (uTime.value - t0) / 1.4;
      if (k >= 1) { onFrame.splice(onFrame.indexOf(env), 1); return; }
      const e = Math.exp(-k * 3.5);
      ring.opacity = 0.3 + 0.65 * e;
      nuc.scale.setScalar(1 + 0.18 * e);
    };
    onFrame.push(env);
  },
  onAlert() { ripple(); },                // the whole mind flinches
};
if (typeof window !== "undefined") window.liveHandlers = liveHandlers;   // console-drivable

onFrame.push(() => {                      // agent heat decays
  for (const [id, until] of agentHot) {
    if (uTime.value > until) {
      const m = agentIndex.get(id);
      if (m) m.userData.boost.value = 1.0;
      agentHot.delete(id);
    }
  }
});

// ---------- ambient life ----------
// synaptic firing: a dim spark on a random similarity edge every 0.8–2s
const simKeys = [...curves.entries()]
  .filter(([, v]) => ["sim", "wikilink", "sim-cross"].includes(v.kind))
  .map(([k]) => k);
let nextSpark = 0;
export const ambient = { enabled: true };
onFrame.push((t) => {
  if (!ambient.enabled || t < nextSpark || !simKeys.length) return;
  nextSpark = t + 0.8 + Math.random() * 1.2;
  const key = simKeys[(Math.random() * simKeys.length) | 0];
  const [a, b] = key.split("|");
  const [f, to] = Math.random() < 0.5 ? [a, b] : [b, a];
  fire(f, to, 0xa78bfa, { scale: 0.45, opacity: 0.5, duration: 1.4 });
});

// ambient drift: ~40 particles cycling working -> memory (summarization made visible)
{
  const N = 40, A = ANCHORS.working, B = ANCHORS.memory;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    map: GRADIENT, color: 0x67e8f9, size: 0.35, transparent: true, opacity: 0.35,
    depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.frustumCulled = false;
  scene.add(pts);
  const seed = Array.from({ length: N }, (_, i) => ({
    off: hash01("drift" + i), bow: 2 + hash01("bow" + i) * 4, ph: hash01("ph" + i) * 6.28 }));
  onFrame.push((t) => {
    if (!ambient.enabled) { pts.visible = false; return; }
    pts.visible = true;
    const arr = geo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const s = seed[i], k = (t * 0.04 + s.off) % 1;
      arr[i * 3]     = A[0] + (B[0] - A[0]) * k + Math.sin(k * Math.PI) * s.bow * Math.sin(s.ph);
      arr[i * 3 + 1] = A[1] + (B[1] - A[1]) * k + Math.sin(k * Math.PI) * s.bow * 0.5;
      arr[i * 3 + 2] = A[2] + (B[2] - A[2]) * k + Math.sin(k * Math.PI) * s.bow * Math.cos(s.ph);
    }
    geo.attributes.position.needsUpdate = true;
  });
}

// idle camera drift: applied as a DELTA so it composes with OrbitControls
let userHolding = false, lastDrift = 0;
controls.addEventListener("start", () => { userHolding = true; });
controls.addEventListener("end", () => { userHolding = false; lastDrift = NaN; });
onFrame.push((t) => {
  if (userHolding) return;
  const d = Math.sin(t * 0.25) * 0.5;
  if (Number.isNaN(lastDrift)) { lastDrift = d; return; }     // no snap on resume
  camera.position.y += d - lastDrift;
  lastDrift = d;
});

// ---------- the observer socket ----------
let es = null, retryMs = 1000, retryT = null;
function connect() {
  if (es || document.hidden) return;
  es = new EventSource("/voice-events");
  es.onopen = () => { retryMs = 1000; };
  es.onmessage = (ev) => {
    let d;
    try { d = JSON.parse(ev.data); } catch { return; }
    switch (d.type) {
      case "dispatch":   if (d.agent) liveHandlers.onDispatch(d.agent); break;
      case "turn_done":  liveHandlers.onTurn(); break;
      case "alert": case "error": liveHandlers.onAlert(); break;
      case "memory_recall": if (d.id) liveHandlers.onRecall(d.id); break;
      case "memory_write":  if (d.id) liveHandlers.onWrite(d.id); break;
      case "transcript": liveHandlers.onTurn(); break;        // the OS heard something
      case "persona": if (d.accent) applyPersonaColor(d.accent); break;
      // everything else: not for us — a spectator ignores what it can't draw truly
    }
  };
  es.onerror = () => {
    es.close(); es = null;
    clearTimeout(retryT);
    retryT = setTimeout(connect, retryMs);
    retryMs = Math.min(15000, retryMs * 2);                    // 1s doubling to 15s cap
  };
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { es?.close(); es = null; clearTimeout(retryT); }
  else connect();                                              // no stale burst replay
});
connect();

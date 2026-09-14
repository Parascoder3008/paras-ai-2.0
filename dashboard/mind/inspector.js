// inspector.js — hover, fly, inspect, search, legend, deep links.
// Loaded via dynamic import at the bottom of scene.js (avoids the TLA deadlock).
import * as THREE from "three";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import {
  scene, camera, controls, onFrame, regionGroups, beadMeshes, agentMeshes,
  coreGroup, skeleton, positions, curves, edgeLayer,
} from "./scene.js";
import { fetchDetail } from "./data.js";
import { ANCHORS } from "./regions.js";

const nodeById = new Map(skeleton.nodes.map((n) => [n.id, n]));

// ---------- CSS2D labels: regions + agents ONLY (never per node) ----------
const labelRenderer = new CSS2DRenderer({ element: document.getElementById("labels") });
labelRenderer.setSize(innerWidth, innerHeight);
addEventListener("resize", () => labelRenderer.setSize(innerWidth, innerHeight));
onFrame.push(() => labelRenderer.render(scene, camera));

function mkLabel(text, cls) {
  const el = document.createElement("div");
  el.className = cls;
  el.textContent = text;
  return new CSS2DObject(el);
}
for (const r of skeleton.regions) {
  if (r.id === "core") continue;
  const l = mkLabel(r.label.toUpperCase(), "lbl-region");
  l.element.style.color = r.color;
  l.position.set(...ANCHORS[r.id]);
  l.position.y += r.id === "knowledge" ? -2.5 : 3.2;
  regionGroups[r.id].add(l);
}
{
  const l = mkLabel("PARAS AI OS", "lbl-core");
  l.position.set(0, 3.4, 0);
  regionGroups.core.add(l);
}

// ---------- raycasting ----------
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tooltip = document.getElementById("tooltip");
let hoverId = null, overlay = null;

function visibleUpChain(o) {
  for (let p = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}
function pick(ev) {
  mouse.x = (ev.clientX / innerWidth) * 2 - 1;
  mouse.y = -(ev.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  const targets = [...beadMeshes, ...agentMeshes].filter(visibleUpChain);
  const hits = ray.intersectObjects(targets, false);
  for (const h of hits) {
    if (h.object.isInstancedMesh) return h.object.userData.ids[h.instanceId];
    if (h.object.userData.nodeId) return h.object.userData.nodeId;
  }
  // the core: cheap sphere test
  if (visibleUpChain(coreGroup)) {
    const s = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1.6);
    if (ray.ray.intersectsSphere(s)) return "core";
  }
  return null;
}

// ---------- edge highlight: dim the world, overlay this node's edges ----------
function setAllEdgeOpacity(v) {
  for (const child of edgeLayer.group.children) {
    const m = child.material;
    if (v === null) m.opacity = m.userData?.base ?? m.opacity;
    else { m.userData ??= {}; m.userData.base ??= m.opacity; m.opacity = v; }
  }
}
function showOverlay(id) {
  clearOverlay();
  const pts = [];
  for (const [key, { curve }] of curves) {
    const [a, b] = key.split("|");
    if (a !== id && b !== id) continue;
    const sampled = curve.getPoints(24);
    for (let i = 0; i < 24; i++) pts.push(sampled[i], sampled[i + 1]);
  }
  if (!pts.length) return;
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  overlay = new THREE.LineSegments(g, new THREE.LineBasicMaterial({
    color: nodeById.get(id)?.color || "#3AB0D8", transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(overlay);                       // scene root: region toggles can't hide it
  setAllEdgeOpacity(0.04);
}
function clearOverlay() {
  if (overlay) { overlay.geometry.dispose(); overlay.material.dispose(); scene.remove(overlay); overlay = null; }
  setAllEdgeOpacity(null);
}

// ---------- hover ----------
addEventListener("pointermove", (ev) => {
  if (ev.target.closest("#panel,#search,#legend")) return;
  const id = pick(ev);
  if (id === hoverId) {
    tooltip.style.left = ev.clientX + 14 + "px";
    tooltip.style.top = ev.clientY + 10 + "px";
    return;
  }
  hoverId = id;
  if (!id) { tooltip.hidden = true; clearOverlay(); return; }
  const n = nodeById.get(id);
  tooltip.hidden = false;
  tooltip.style.left = ev.clientX + 14 + "px";
  tooltip.style.top = ev.clientY + 10 + "px";
  tooltip.querySelector(".tt-region").textContent = n ? n.region : "";
  tooltip.querySelector(".tt-label").textContent = n ? n.label : id;
  tooltip.querySelector(".tt-sub").textContent =
    n?.extra?.desc || n?.extra?.specialty || n?.extra?.path || n?.extra?.folder || n?.type || "";
  showOverlay(id);
});

// ---------- click to fly + inspector ----------
let flying = null, downAt = null;
addEventListener("pointerdown", (ev) => { downAt = [ev.clientX, ev.clientY]; });
controls.addEventListener("start", () => { flying = null; });   // grabbing cancels the glide

function flyTo(id) {
  const p = positions.get(id) || (id === "core" ? [0, 0, 0] : null);
  if (!p) return;
  const target = new THREE.Vector3(...p);
  const dir = camera.position.clone().sub(controls.target).normalize();
  const dist = id === "core" ? 9 : 4.5;
  flying = { pos: target.clone().add(dir.multiplyScalar(dist)), tgt: target };
  controls.autoRotate = false;
  openPanel(id);
  history.replaceState(null, "", "#node=" + encodeURIComponent(id));
}
onFrame.push(() => {
  if (!flying) return;
  camera.position.lerp(flying.pos, 0.08);
  controls.target.lerp(flying.tgt, 0.08);
  if (camera.position.distanceTo(flying.pos) < 0.05) flying = null;
});
function overview() {
  flying = { pos: new THREE.Vector3(0, 9, 34), tgt: new THREE.Vector3(0, 0, 0) };
  controls.autoRotate = true;
  closePanel();
  history.replaceState(null, "", location.pathname);
}
addEventListener("pointerup", (ev) => {
  if (!downAt) return;
  const moved = Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]);
  downAt = null;
  if (moved > 6) return;                                        // that was a drag
  if (ev.target.closest("#panel,#search,#legend,#hud")) return;
  const id = pick(ev);
  if (id) flyTo(id);
});
addEventListener("dblclick", (ev) => { if (!pick(ev)) overview(); });
addEventListener("keydown", (ev) => { if (ev.key === "Escape") overview(); });

// ---------- inspector panel (textContent ONLY — memory bodies are raw user text) ----------
const panel = document.getElementById("panel");
let fetchToken = 0;
async function openPanel(id) {
  const tok = ++fetchToken;
  panel.hidden = false;
  panel.querySelector("#p-title").textContent = nodeById.get(id)?.label || id;
  panel.querySelector("#p-badge").textContent = nodeById.get(id)?.type || "";
  panel.querySelector("#p-meta").textContent = "loading…";
  panel.querySelector("#p-body").textContent = "";
  const nb = panel.querySelector("#p-neighbors");
  nb.replaceChildren();
  const d = await fetchDetail(id);
  if (tok !== fetchToken) return;                               // stale fetch guard
  if (!d) { panel.querySelector("#p-meta").textContent = "no detail available"; return; }
  panel.querySelector("#p-title").textContent = d.label || id;
  panel.querySelector("#p-badge").textContent = d.mtype || d.type || "";
  panel.querySelector("#p-meta").textContent =
    [d.modified, d.source, d.specialty, d.tools && ("tools: " + d.tools)].filter(Boolean).join(" · ");
  panel.querySelector("#p-body").textContent = d.body || "";
  for (const n of d.neighbors || []) {
    const li = document.createElement("button");
    li.className = "p-nb";
    li.textContent = `${nodeById.get(n.id)?.label || n.id}  (${n.weight})`;
    li.addEventListener("click", () => flyTo(n.id));            // wandering the mind
    nb.append(li);
  }
}
function closePanel() { panel.hidden = true; }
panel.querySelector("#p-close").addEventListener("click", closePanel);

// ---------- search ----------
const search = document.getElementById("search");
search.addEventListener("keydown", (ev) => {
  ev.stopPropagation();                                         // typing never drives the scene
  if (ev.key !== "Enter") return;
  const q = search.value.trim().toLowerCase();
  if (!q) return;
  const scored = skeleton.nodes
    .map((n) => {
      const l = n.label.toLowerCase(), i = n.id.toLowerCase();
      let s = -1;
      if (l.startsWith(q) || i.startsWith(q)) s = 1000 - n.label.length;
      else if (l.includes(q) || i.includes(q)) s = 500 - n.label.length;
      return [s, n];
    })
    .filter(([s]) => s > 0)
    .sort((a, b) => b[0] - a[0]);
  if (scored.length) flyTo(scored[0][1].id);
});

// ---------- legend: region toggles ----------
const legend = document.getElementById("legend");
for (const r of skeleton.regions) {
  const chip = document.createElement("button");
  chip.className = "chip";
  chip.style.setProperty("--c", r.color);
  chip.textContent = r.label;
  chip.setAttribute("aria-pressed", "true");
  chip.addEventListener("click", () => {
    const g = regionGroups[r.id];
    g.visible = !g.visible;
    chip.setAttribute("aria-pressed", String(g.visible));
    // honest limitation: cross-region edges pick one kind's geometry and may survive
  });
  legend.append(chip);
}

// ---------- deep link ----------
const m = location.hash.match(/#node=([^&]+)/);
if (m) {
  const id = decodeURIComponent(m[1]);
  if (nodeById.has(id)) setTimeout(() => flyTo(id), 400);
}

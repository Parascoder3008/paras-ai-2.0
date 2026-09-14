// scene.js — assembly + frame loop for the Living Mind.
// Tier 2: the void. Renderer, camera, orbit, fog, bloom, starfield, membrane.
// Later tiers add nodes/edges/live layers on top of this scaffold.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// ---- one shared clock uniform: every material references THIS object ----
export const uTime = { value: 0 };

// ---- sizing: read the real box, not window.innerWidth/innerHeight ----
// This page is embedded in an iframe inside the deck's CSS Grid. At module
// load the iframe's own window can still be at its pre-layout default (the
// browser's classic 300x150 iframe box) because resizing an iframe ELEMENT
// from the parent page does not reliably fire a `resize` event INSIDE it.
// A one-shot innerWidth/innerHeight read then bakes 300x150 into the canvas's
// inline style forever, which overrides the CSS `inset:0` rule and pins the
// whole scene into a tiny corner — invisible, with only the CSS2D region
// labels (positioned independently) showing. ResizeObserver watches the
// actual rendered box continuously, so it self-corrects the moment the grid
// finishes laying out, and keeps working if the container is resized later.
function boxSize() {
  const r = document.documentElement.getBoundingClientRect();
  return [Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.height))];
}

// ---- renderer / camera / controls ----
const canvas = document.getElementById("view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); // 3x DPR buys nothing but frame time
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070b);
scene.fog = new THREE.FogExp2(0x05070b, 0.012);

const [W0, H0] = boxSize();
export const camera = new THREE.PerspectiveCamera(55, W0 / H0, 0.1, 400);
camera.position.set(0, 9, 34);

export const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.35;
controls.minDistance = 6;
controls.maxDistance = 70;   // the mind has an outside, but you can't leave orbit

// ---- bloom: the single highest-leverage pass in the build ----
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
export const bloom = new UnrealBloomPass(new THREE.Vector2(W0, H0), 1.15, 0.6, 0.72);
composer.addPass(bloom);

// ---- starfield: ~600 twinkling points on a far shell ----
{
  const N = 600;
  const pos = new Float32Array(N * 3);
  const phase = new Float32Array(N);
  const size = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    // uniform direction, radius 80–160
    const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2;
    const r = 80 + Math.random() * 80, s = Math.sqrt(1 - u * u);
    pos.set([r * s * Math.cos(t), r * u, r * s * Math.sin(t)], i * 3);
    phase[i] = Math.random() * Math.PI * 2;
    size[i] = 0.6 + Math.random() * 1.7;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aPhase; attribute float aSize;
      varying float vPhase;
      void main(){
        vPhase = aPhase;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * 220.0 / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime; varying float vPhase;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float fall = pow(1.0 - d * 2.0, 2.0);
        // peaks deliberately cross the bloom threshold -> sparkle, not pulse
        float tw = 0.55 + 0.45 * sin(uTime * (0.6 + fract(vPhase) * 0.9) + vPhase * 7.0);
        gl_FragColor = vec4(vec3(0.75, 0.85, 1.0) * fall * tw, fall * tw);
      }`,
  });
  scene.add(new THREE.Points(g, m));
}

// ---- membrane: the boundary of the mind ----
export const membrane = (() => {
  const m = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0.06 }, uColor: { value: new THREE.Color(0x1a9fd1) } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vW;
      void main(){
        vN = normalize(normalMatrix * normal);
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform float uOpacity; uniform vec3 uColor;
      varying vec3 vN; varying vec3 vW;
      void main(){
        vec3 v = normalize(cameraPosition - vW);
        // abs(): BackSide flips normals — max() would clamp to a solid disk
        float rim = pow(1.0 - abs(dot(normalize(vN), v)), 3.0);
        gl_FragColor = vec4(uColor * rim, rim * uOpacity * 14.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(26, 48, 32), m);
  scene.add(mesh);
  return m;   // exported so Tier 6's alert-ripple can sweep uOpacity
})();

// ---- resize: camera + renderer + composer, driven by the real box ----
function applySize() {
  const [w, h] = boxSize();
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}
applySize();                                   // first paint, correct even pre-layout
new ResizeObserver(applySize).observe(document.documentElement);
addEventListener("resize", applySize);         // belt-and-braces on top of the observer

// ---- frame loop + FPS governor ----
const clock = new THREE.Clock();
export const onFrame = [];   // later tiers push per-frame updaters here

// Rolling 60-frame sample; degrade only when <30fps SUSTAINS for 3s —
// one GC pause is not a weak GPU.
const frameTimes = [];
let lastT = 0, lowSince = null, degradeStep = 0;
function govern(now) {
  if (lastT) {
    frameTimes.push(now - lastT);
    if (frameTimes.length > 60) frameTimes.shift();
  }
  lastT = now;
  if (frameTimes.length < 60) return;
  const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  if (avg > 1 / 30) {
    lowSince ??= now;
    if (now - lowSince > 3 && degradeStep === 0) {
      degradeStep = 1;
      bloom.enabled = false;
      console.info("[mind] governor: bloom off (sustained <30fps)");
    } else if (now - lowSince > 6 && degradeStep === 1) {
      degradeStep = 2;
      import("./live.js").then((m) => { m.ambient.enabled = false; });
      for (const child of (scene.getObjectByName("edges")?.children || [])) {
        const u = child.material.uniforms;
        if (u?.uShimmer) u.uShimmer.value = 0;
        if (u?.uFlow) u.uFlow.value = 0;
      }
      console.info("[mind] governor: ambient + shimmer/flow frozen");
    }
  } else lowSince = null;
}

renderer.info.autoReset = false;             // composer runs several passes; count them all
renderer.setAnimationLoop(() => {
  if (document.hidden) return;               // no work for a hidden tab
  const t = clock.getElapsedTime();
  uTime.value = t;
  govern(t);
  controls.update();
  for (const fn of onFrame) fn(t);
  renderer.info.reset();
  composer.render();
});

// ---- data + population (Tier 3/4) ----
import { fetchSkeleton, renderStats } from "./data.js";
import { layout } from "./regions.js";
import { buildBeads, buildCore, buildAgentSphere } from "./nodes.js";

export const regionGroups = {};   // region -> THREE.Group (legend toggles flip these)
export const beadMeshes = [];     // InstancedMesh list for raycasting
export const agentMeshes = [];
export let skeleton = null;
export let positions = null;
export let coreGroup = null;

const skel = await fetchSkeleton();     // throws + reports on failure — no silent void
skeleton = skel;
renderStats(skel);
positions = layout(skel);

for (const r of skel.regions) {
  const g = new THREE.Group();
  g.name = "region:" + r.id;
  regionGroups[r.id] = g;
  scene.add(g);
}

// core: the layered sun
const coreNode = skel.nodes.find((n) => n.id === "core");
coreGroup = buildCore(coreNode, uTime);
regionGroups.core.add(coreGroup);
onFrame.push((t) => coreGroup.userData.update(t));

// sub-agents: individual glow spheres (they need per-node boost uniforms)
for (const n of skel.nodes.filter((x) => x.type === "agent")) {
  const m = buildAgentSphere(n, positions.get(n.id), uTime);
  regionGroups.agents.add(m);
  agentMeshes.push(m);
}

// everything small: one instanced bead population per region
const SMALL = { memory: [], working: [], knowledge: [], rim: [], agents: [] };
for (const n of skel.nodes) {
  if (n.type === "core" || n.type === "agent") continue;
  (SMALL[n.region] ??= []).push(n);
}
for (const [region, arr] of Object.entries(SMALL)) {
  if (!arr.length) continue;
  const { group, mesh } = buildBeads(arr, positions, uTime);
  regionGroups[region].add(group);
  beadMeshes.push(mesh);
}

// edges: merged per kind, arced, shimmering/flowing (Tier 5)
import { buildEdges, curves } from "./edges.js";
export { curves };
export const edgeLayer = buildEdges(skel, positions, uTime);
scene.add(edgeLayer.group);

// one-time draw-call audit: low tens, or something is uninstanced
setTimeout(() => {
  console.info(`[mind] draw calls/frame: ${renderer.info.render.calls} · ` +
    `triangles: ${renderer.info.render.triangles}`);
}, 2500);

// interaction + live layers load DYNAMICALLY: a static import back into this
// module would deadlock against the top-level await above.
import("./inspector.js");
import("./live.js");

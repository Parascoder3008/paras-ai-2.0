// edges.js — curves and pulses. Every edge is an arc (straight lines slice
// through clusters); all edges of one kind merge into ONE LineSegments.
import * as THREE from "three";
import { hash01 } from "./regions.js";

const SEGMENTS = 24;

// per-kind treatment: color, base opacity, and which shader runs it
const KINDS = {
  sim:        { color: 0xa78bfa, opacity: 0.20, mode: "shimmer" },
  "sim-know": { color: 0xf5a524, opacity: 0.10, mode: "shimmer" },
  "sim-cross":{ color: 0xc4b5fd, opacity: 0.14, mode: "shimmer" },
  wikilink:   { color: 0x8b5cf6, opacity: 0.22, mode: "shimmer" },
  moon:       { color: 0xe88fb3, opacity: 0.14, mode: "plain" },
  member:     { color: 0x8b93a1, opacity: 0.14, mode: "plain" },
  attention:  { color: 0x67e8f9, opacity: 0.18, mode: "flow", speed: -0.25 },
  dispatch:   { color: 0xe88fb3, opacity: 0.16, mode: "flow", speed: 0.22 },
  capability: { color: 0x8b93a1, opacity: 0.14, mode: "flow", speed: 0.18 },
  recall:     { color: 0xa78bfa, opacity: 0.22, mode: "flow", speed: -0.30 }, // inward
};

export const curves = new Map();   // "source|target" -> {curve, kind} for the pulse system

function arcCurve(a, b) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const chord = vb.clone().sub(va);
  const out = mid.clone().normalize();                       // outward from origin
  let perp = chord.clone().cross(out);
  if (perp.lengthSq() < 1e-6) perp = new THREE.Vector3(0, 1, 0);
  perp.normalize().multiplyScalar(chord.length() * 0.12);
  return new THREE.QuadraticBezierCurve3(va, mid.add(perp), vb);
}

function shimmerMaterial(color, baseOpacity, uTime) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime, uBase: { value: baseOpacity }, uColor: { value: new THREE.Color(color) },
                uShimmer: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aPhase; varying float vPhase;
      void main(){ vPhase = aPhase;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uBase, uShimmer; uniform vec3 uColor; varying float vPhase;
      void main(){
        float a = uBase * (1.0 + uShimmer * 0.55 * sin(uTime * 1.6 + vPhase));
        gl_FragColor = vec4(uColor, a); }`,
  });
  routeOpacity(m, "uBase");
  return m;
}

function flowMaterial(color, baseOpacity, speed, uTime) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime, uBase: { value: baseOpacity }, uColor: { value: new THREE.Color(color) },
                uSpeed: { value: speed }, uFlow: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aPhase; attribute float aT; attribute float aW;
      varying float vPhase; varying float vT; varying float vW;
      void main(){ vPhase = aPhase; vT = aT; vW = aW;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uBase, uSpeed, uFlow; uniform vec3 uColor;
      varying float vPhase; varying float vT; varying float vW;
      void main(){
        float base = uBase * 0.55;
        // comet head + exponential tail; sign of uSpeed sets direction of thought
        float head = fract(uTime * uSpeed + vPhase);
        float d = fract(head - vT);
        float band = exp(-d * 9.0) * uFlow;
        vec3 c = mix(uColor, vec3(1.0), band * 0.7);
        gl_FragColor = vec4(c, (base + band * 0.85) * vW); }`,
  });
  routeOpacity(m, "uBase");
  return m;
}

// hover code sets material.opacity; ShaderMaterial ignores it — route to the uniform
function routeOpacity(mat, uniformName) {
  Object.defineProperty(mat, "opacity", {
    get() { return mat.uniforms[uniformName].value; },
    set(v) { if (mat.uniforms) mat.uniforms[uniformName].value = v; },
  });
}

/** Build merged LineSegments per edge kind. Returns { group, materials }. */
export function buildEdges(skeleton, positions, uTime) {
  const group = new THREE.Group();
  group.name = "edges";
  const byKind = {};
  for (const e of skeleton.edges) (byKind[e.kind] ??= []).push(e);
  const materials = {};

  for (const [kind, list] of Object.entries(byKind)) {
    const spec = KINDS[kind] || { color: 0x8b93a1, opacity: 0.12, mode: "plain" };
    const pts = [], phases = [], ts = [], ws = [];
    for (const e of list) {
      const a = positions.get(e.source), b = positions.get(e.target);
      if (!a || !b) continue;                       // unknown endpoint: draw nothing
      const curve = arcCurve(a, b);
      curves.set(`${e.source}|${e.target}`, { curve, kind });
      const phase = hash01(`${e.source}|${e.target}`) * Math.PI * 2;
      const sampled = curve.getPoints(SEGMENTS);
      const w = Math.min(1, (e.weight ?? 1));
      for (let i = 0; i < SEGMENTS; i++) {
        pts.push(sampled[i], sampled[i + 1]);
        phases.push(phase, phase);
        ts.push(i / SEGMENTS, (i + 1) / SEGMENTS);
        ws.push(w, w);
      }
    }
    if (!pts.length) continue;
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    g.setAttribute("aPhase", new THREE.Float32BufferAttribute(phases, 1));
    if (spec.mode === "flow") {
      g.setAttribute("aT", new THREE.Float32BufferAttribute(ts, 1));
      g.setAttribute("aW", new THREE.Float32BufferAttribute(ws, 1));
    }
    let mat;
    if (spec.mode === "shimmer") mat = shimmerMaterial(spec.color, spec.opacity, uTime);
    else if (spec.mode === "flow") mat = flowMaterial(spec.color, spec.opacity, spec.speed, uTime);
    else {
      mat = new THREE.LineBasicMaterial({ color: spec.color, transparent: true,
        opacity: spec.opacity, blending: THREE.AdditiveBlending, depthWrite: false });
    }
    const lines = new THREE.LineSegments(g, mat);
    lines.name = "edges:" + kind;
    materials[kind] = mat;
    group.add(lines);
  }
  return { group, materials };
}

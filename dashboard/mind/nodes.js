// nodes.js — meshes and shaders. The reverse-fresnel glow recipe lives here:
// white-hot core bleeding into a colored halo; with bloom it reads as light.
import * as THREE from "three";
import { hash01 } from "./regions.js";

// ---------- shared radial-gradient sprite texture (generated once) ----------
export function radialTexture(inner = "rgba(255,255,255,1)", outer = "rgba(255,255,255,0)") {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const GRADIENT = radialTexture();

// ---------- instanced glow-bead population (one draw call per region) ----------
const beadVertex = /* glsl */`
  attribute float aPhase;
  attribute float aFreshness;
  attribute vec3 aColor;
  varying vec3 vN; varying vec3 vView; varying vec3 vColor; varying float vFresh;
  uniform float uTime;
  void main(){
    vColor = aColor; vFresh = aFreshness;
    float breath = 1.0 + 0.06 * (0.5 + aFreshness) *
      sin(uTime * (3.5 + 2.5 * fract(aPhase * 0.7)) + aPhase * 6.2831);
    vec3 p = position * breath;
    vec4 world = instanceMatrix * vec4(p, 1.0);          // three injects instanceMatrix
    vec4 mv = viewMatrix * modelMatrix * world;
    vN = normalize(normalMatrix * (mat3(instanceMatrix) * normal));
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const beadFragment = /* glsl */`
  varying vec3 vN; varying vec3 vView; varying vec3 vColor; varying float vFresh;
  void main(){
    float facing = max(dot(normalize(vN), normalize(vView)), 0.0);
    float core = pow(facing, 2.5);
    float rim = pow(1.0 - facing, 2.0);
    float bright = 0.45 + 0.75 * vFresh;                 // fresh burns, stale embers
    vec3 col = (mix(vColor, vec3(1.0), core * 0.85) + vColor * rim * 1.4) * bright;
    gl_FragColor = vec4(col, core * 0.95 + rim * 0.6);
  }`;

// halo: billboarded instanced quads SHARING the bead instance buffers
const haloVertex = /* glsl */`
  attribute float aPhase;
  attribute float aFreshness;
  attribute vec3 aColor;
  varying vec2 vUv; varying vec3 vColor; varying float vFresh;
  uniform float uTime;
  void main(){
    vColor = aColor; vFresh = aFreshness; vUv = position.xy * 2.0;
    float breath = 1.0 + 0.06 * (0.5 + aFreshness) *
      sin(uTime * (3.5 + 2.5 * fract(aPhase * 0.7)) + aPhase * 6.2831);
    float s = length(vec3(instanceMatrix[0])) * breath * 3.1;   // instance scale
    vec3 origin = (viewMatrix * modelMatrix * instanceMatrix * vec4(0.,0.,0.,1.)).xyz;
    gl_Position = projectionMatrix * vec4(origin + vec3(position.xy * s, 0.0), 1.0);
  }`;
const haloFragment = /* glsl */`
  varying vec2 vUv; varying vec3 vColor; varying float vFresh;
  void main(){
    float fall = pow(max(1.0 - length(vUv), 0.0), 2.2);   // analytic soft falloff
    gl_FragColor = vec4(vColor * fall, fall * (0.28 + 0.30 * vFresh));
  }`;

/** Build the instanced bead + halo pair for one region's small nodes.
 *  Returns { group, ids } — ids[] maps instanceId back to node id for raycasts. */
export function buildBeads(nodesArr, positions, uTime) {
  const n = nodesArr.length;
  const geo = new THREE.SphereGeometry(1, 24, 16);       // icosahedron reads faceted
  const phase = new Float32Array(n), fresh = new Float32Array(n), color = new Float32Array(n * 3);
  const c = new THREE.Color();
  nodesArr.forEach((node, i) => {
    phase[i] = hash01(node.id) * Math.PI * 2;
    fresh[i] = node.freshness;
    c.set(node.color);
    color.set([c.r, c.g, c.b], i * 3);
  });
  const attrs = {
    aPhase: new THREE.InstancedBufferAttribute(phase, 1),
    aFreshness: new THREE.InstancedBufferAttribute(fresh, 1),
    aColor: new THREE.InstancedBufferAttribute(color, 3),
  };
  for (const [k, a] of Object.entries(attrs)) geo.setAttribute(k, a);

  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime }, vertexShader: beadVertex, fragmentShader: beadFragment,
    transparent: true, depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const m4 = new THREE.Matrix4();
  nodesArr.forEach((node, i) => {
    const p = positions.get(node.id);
    const s = 0.16 * node.size;
    m4.makeScale(s, s, s).setPosition(p[0], p[1], p[2]);
    mesh.setMatrixAt(i, m4);
  });
  mesh.instanceMatrix.needsUpdate = true;

  const haloGeo = new THREE.PlaneGeometry(1, 1);
  for (const [k, a] of Object.entries(attrs)) haloGeo.setAttribute(k, a);
  const haloMat = new THREE.ShaderMaterial({
    uniforms: { uTime }, vertexShader: haloVertex, fragmentShader: haloFragment,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const halo = new THREE.InstancedMesh(haloGeo, haloMat, n);
  halo.instanceMatrix = mesh.instanceMatrix;             // shared: animation moves both
  halo.renderOrder = -1;
  halo.frustumCulled = false;                            // shader-expanded, CPU bounds wrong
  mesh.userData.ids = nodesArr.map((x) => x.id);         // raycast instanceId -> node id

  const group = new THREE.Group();
  group.add(halo, mesh);
  return { group, mesh };
}

// ---------- the core: a layered sun ----------
export function buildCore(coreNode, uTime) {
  const g = new THREE.Group();                            // outer group (static position)
  const nucleus = new THREE.Group();                      // breathes/flares as one organism
  g.add(nucleus);
  const col = new THREE.Color(coreNode.color);

  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false }));
  nucleus.add(inner);

  const shellMat = new THREE.ShaderMaterial({
    uniforms: { uTime, uColor: { value: col } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vView;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; varying vec3 vN; varying vec3 vView;
      void main(){
        float facing = max(dot(normalize(vN), normalize(vView)), 0.0);
        float core = pow(facing, 2.0); float rim = pow(1.0 - facing, 2.0);
        vec3 c = mix(uColor, vec3(1.0), core * 0.7) + uColor * rim * 1.6;
        gl_FragColor = vec4(c, core * 0.5 + rim * 0.85);
      }`,
  });
  nucleus.add(new THREE.Mesh(new THREE.SphereGeometry(1.35, 32, 24), shellMat));

  // two counter-rotating corona billboards
  const mkCorona = (scale, opacity) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: GRADIENT, color: col, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(scale);
    nucleus.add(s);
    return s;
  };
  const coronaA = mkCorona(4.2, 0.55), coronaB = mkCorona(7.5, 0.22);

  // prompt rings — torus symmetry axis is Z, so visible spin must be about Y
  const ringMat1 = new THREE.MeshBasicMaterial({ color: col, transparent: true,
    opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.03, 8, 96), ringMat1);
  ring1.rotation.x = Math.PI / 2;
  const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x3ab0d8, transparent: true,
    opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.02, 8, 96), ringMat2);
  ring2.rotation.x = Math.PI / 2.6;
  ring2.rotation.z = 0.4;
  g.add(ring1, ring2);

  // Retarget the whole star's colour live (persona switch). Ring2 stays a
  // fixed cool accent so the star always reads as two colours, not a flat wash.
  // Lerped at a fixed per-frame rate rather than by delta time — onFrame hands
  // us elapsed time, not a tick delta, and ~6%/frame reads as a cinematic
  // ~1s glow-shift at 60fps without needing one.
  const liveColor = col.clone();
  g.userData.setColor = (hex) => liveColor.set(hex);
  g.userData.update = (t) => {
    col.lerp(liveColor, 0.06);
    shellMat.uniforms.uColor.value.copy(col);
    coronaA.material.color.copy(col);
    coronaB.material.color.copy(col);
    ringMat1.color.copy(col);
    nucleus.scale.setScalar(1 + 0.04 * Math.sin(t * 1.1));
    coronaA.material.rotation = t * 0.12;
    coronaB.material.rotation = -t * 0.07;
    ring1.rotation.y = t * 0.10;                          // about Y — Z would be invisible
    ring2.rotation.y = -t * 0.14;
    ringMat2.opacity = 0.22 + 0.14 * Math.sin(t * 0.7);   // the dynamic ring breathes
  };
  g.userData.nucleus = nucleus;
  g.userData.dynamicRing = ringMat2;
  return g;
}

// ---------- sub-agents: bigger glow spheres in their own accent ----------
export function buildAgentSphere(node, position, uTime) {
  const col = new THREE.Color(node.color);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime, uColor: { value: col }, uBoost: { value: 1.0 },
                uPhase: { value: hash01(node.id) * Math.PI * 2 } },
    transparent: true, depthWrite: false,
    vertexShader: /* glsl */`
      uniform float uTime; uniform float uPhase;
      varying vec3 vN; varying vec3 vView;
      void main(){
        vec3 p = position * (1.0 + 0.05 * sin(uTime * 2.2 + uPhase));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * normal); vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uBoost;
      varying vec3 vN; varying vec3 vView;
      void main(){
        float facing = max(dot(normalize(vN), normalize(vView)), 0.0);
        float core = pow(facing, 2.5); float rim = pow(1.0 - facing, 2.0);
        vec3 c = (mix(uColor, vec3(1.0), core * 0.85) + uColor * rim * 1.4) * uBoost;
        gl_FragColor = vec4(c, core * 0.95 + rim * 0.6);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), mat);
  mesh.position.set(...position);
  // no per-agent halo sprite: 28 extra draw calls for what the rim glow +
  // bloom already provide. uBoost doubles the shader brightness instead.
  mesh.userData.nodeId = node.id;
  mesh.userData.boost = mat.uniforms.uBoost;              // Tier 6 doubles this on dispatch
  return mesh;
}

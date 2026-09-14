// regions.js — pure layout math. No three.js scene objects, no DOM: takes the
// skeleton, returns Map(nodeId -> [x,y,z]). Deterministic on every reload.

export const ANCHORS = {
  core:      [0, 0, 0],
  memory:    [-13, 4, -3],
  working:   [-2, -2, 12],
  agents:    [13, 3, -2],
  knowledge: [0, -9, -10],
  rim:       [5, 11, 6],
};

// FNV-1a hash -> [0,1). Stable per id: reloads never reshuffle the mind.
export function hash01(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h / 4294967295;
}

function seeded(id, spread, cx, cy, cz) {
  const a = hash01(id) * Math.PI * 2, b = hash01(id + "b") * Math.PI - Math.PI / 2;
  const r = 0.5 + hash01(id + "r") * spread;
  return [cx + r * Math.cos(b) * Math.cos(a), cy + r * Math.sin(b), cz + r * Math.cos(b) * Math.sin(a)];
}

// ---- force-directed memory web: ~150 iterations, baked once, never per frame ----
function layoutMemoryWeb(ids, edges, anchor) {
  const N = ids.length;
  const idx = new Map(ids.map((d, i) => [d, i]));
  const px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N);
  const vx = new Float32Array(N), vy = new Float32Array(N), vz = new Float32Array(N);
  ids.forEach((id, i) => {
    const p = seeded(id, 5.5, 0, 0, 0);
    px[i] = p[0]; py[i] = p[1]; pz[i] = p[2];
  });
  const springs = [];
  for (const e of edges) {
    const a = idx.get(e.source), b = idx.get(e.target);
    if (a !== undefined && b !== undefined) springs.push([a, b, e.weight || 1]);
  }
  const REPEL = 2.6, SPRING = 0.06, REST = 2.2, GRAVITY = 0.015, DAMP = 0.82, MIND = 0.55;
  for (let it = 0; it < 150; it++) {
    for (let i = 0; i < N; i++) {
      let fx = 0, fy = 0, fz = 0;
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        let dx = px[i] - px[j], dy = py[i] - py[j], dz = pz[i] - pz[j];
        let d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < MIND * MIND) d2 = MIND * MIND;      // coincident nodes must not explode
        const f = REPEL / d2, d = Math.sqrt(d2);
        fx += (dx / d) * f; fy += (dy / d) * f; fz += (dz / d) * f;
      }
      fx -= px[i] * GRAVITY; fy -= py[i] * GRAVITY; fz -= pz[i] * GRAVITY;
      vx[i] = (vx[i] + fx) * DAMP; vy[i] = (vy[i] + fy) * DAMP; vz[i] = (vz[i] + fz) * DAMP;
    }
    for (const [a, b, w] of springs) {
      const dx = px[b] - px[a], dy = py[b] - py[a], dz = pz[b] - pz[a];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-4;
      const f = SPRING * w * (d - REST) / d;
      vx[a] += dx * f; vy[a] += dy * f; vz[a] += dz * f;
      vx[b] -= dx * f; vy[b] -= dy * f; vz[b] -= dz * f;
    }
    for (let i = 0; i < N; i++) { px[i] += vx[i]; py[i] += vy[i]; pz[i] += vz[i]; }
  }
  const out = new Map();
  ids.forEach((id, i) => out.set(id, [anchor[0] + px[i], anchor[1] + py[i], anchor[2] + pz[i]]));
  return out;
}

export function layout(skeleton) {
  const pos = new Map();
  const byRegion = {};
  for (const n of skeleton.nodes) (byRegion[n.region] ??= []).push(n);

  pos.set("core", [0, 0, 0]);

  // memory: the force web (memories + obsidian notes share the region)
  {
    const ids = (byRegion.memory || []).map((n) => n.id);
    const webEdges = skeleton.edges.filter((e) =>
      ["sim", "wikilink", "sim-cross"].includes(e.kind) &&
      ids.includes(e.source) && ids.includes(e.target));
    for (const [id, p] of layoutMemoryWeb(ids, webEdges, ANCHORS.memory)) pos.set(id, p);
  }

  // working: even ring, slight vertical wobble
  {
    const a = ANCHORS.working, items = byRegion.working || [];
    items.forEach((n, i) => {
      const t = (i / Math.max(1, items.length)) * Math.PI * 2;
      pos.set(n.id, [a[0] + 3.5 * Math.cos(t),
                     a[1] + Math.sin(t * 2.3 + hash01(n.id) * 6) * 0.7,
                     a[2] + 3.5 * Math.sin(t)]);
    });
  }

  // agents: a vertical arc of presences; tool moons cluster around their host
  {
    const a = ANCHORS.agents;
    const hosts = (byRegion.agents || []).filter((n) => n.type === "agent");
    const moons = (byRegion.agents || []).filter((n) => n.type === "agent-tool");
    hosts.forEach((n, i) => {
      const t = hosts.length > 1 ? i / (hosts.length - 1) : 0.5;   // 0..1 down the arc
      pos.set(n.id, [a[0] + Math.sin(t * Math.PI) * 4.5,
                     a[1] + (t - 0.5) * 17,
                     a[2] + Math.cos(t * Math.PI) * 3.0 - 1.5]);
    });
    for (const m of moons) {
      const host = pos.get(m.extra.host) || a;
      const u = hash01(m.id) * Math.PI * 2, v = hash01(m.id + "v") * Math.PI - Math.PI / 2;
      pos.set(m.id, [host[0] + 1.15 * Math.cos(v) * Math.cos(u),
                     host[1] + 1.15 * Math.sin(v),
                     host[2] + 1.15 * Math.cos(v) * Math.sin(u)]);
    }
  }

  // knowledge: flat grid, ceil(sqrt(n)) columns
  {
    const a = ANCHORS.knowledge, items = byRegion.knowledge || [];
    const cols = Math.ceil(Math.sqrt(items.length || 1));
    const gap = 1.05;
    items.forEach((n, i) => {
      const cx = (i % cols) - (cols - 1) / 2;
      const cz = Math.floor(i / cols) - (Math.ceil(items.length / cols) - 1) / 2;
      pos.set(n.id, [a[0] + cx * gap, a[1] + (hash01(n.id) - 0.5) * 0.35, a[2] + cz * gap]);
    });
  }

  // rim: capability ball — categories golden-angle on an inner sphere,
  // each category's tools bundled around it like grapes
  {
    const a = ANCHORS.rim;
    const cats = (byRegion.rim || []).filter((n) => n.type === "tool-category");
    const tools = (byRegion.rim || []).filter((n) => n.type === "tool");
    const GA = Math.PI * (3 - Math.sqrt(5));
    cats.forEach((n, i) => {
      const y = cats.length > 1 ? 1 - (2 * i) / (cats.length - 1) : 0;
      const r = Math.sqrt(Math.max(0, 1 - y * y)), t = GA * i;
      pos.set(n.id, [a[0] + 3.4 * r * Math.cos(t), a[1] + 3.4 * y, a[2] + 3.4 * r * Math.sin(t)]);
    });
    for (const tl of tools) {
      const host = pos.get("toolcat:" + tl.extra.category) || a;
      const u = hash01(tl.id) * Math.PI * 2, v = hash01(tl.id + "v") * Math.PI - Math.PI / 2;
      pos.set(tl.id, [host[0] + 0.95 * Math.cos(v) * Math.cos(u),
                      host[1] + 0.95 * Math.sin(v),
                      host[2] + 0.95 * Math.cos(v) * Math.sin(u)]);
    }
  }

  // anything unplaced (unknown region): seeded near origin, never invisible
  for (const n of skeleton.nodes) if (!pos.has(n.id)) pos.set(n.id, seeded(n.id, 4, 0, 0, 0));
  return pos;
}

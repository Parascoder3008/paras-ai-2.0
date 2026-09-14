// data.js — fetching + (later) the live socket. Fails loudly: a silent black
// page is the worst outcome for a page whose job is showing what's there.

export async function fetchSkeleton() {
  const statsEl = document.getElementById("stats");
  let r;
  try {
    r = await fetch("/api/mind-map");
  } catch (e) {
    statsEl.textContent = "failed to load mind — is the server up?";
    statsEl.classList.add("err");
    throw e;
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error || !Array.isArray(d.nodes)) {
    statsEl.textContent = "failed to load mind: " + (d.error || "HTTP " + r.status);
    statsEl.classList.add("err");
    throw new Error(d.error || "mind-map fetch failed");
  }
  return d;
}

export function renderStats(d) {
  const s = d.stats || {};
  const bad = Object.entries(s.sources || {}).filter(([, v]) => v !== "ok").map(([k]) => k);
  const line =
    `${d.nodes.length} nodes · ${d.edges.length} edges · ` +
    `memories ${s.memory_shown ?? "?"}/${s.memory_total ?? "?"} · ` +
    `knowledge ${s.knowledge_shown ?? "?"}/${s.knowledge_total ?? "?"} · ` +
    `similarity ${s.similarity || "none"}` +
    (bad.length ? ` · SOURCES DOWN: ${bad.join(", ")}` : "");
  const el = document.getElementById("stats");
  el.textContent = line;
  el.classList.toggle("err", bad.length > 0);
}

export async function fetchDetail(id) {
  const r = await fetch("/api/mind-map/node/" + encodeURIComponent(id));
  if (!r.ok) return null;
  return r.json();
}

// deck.js — the command deck. Boot sequence, live roster, task feed, voice/typed
// input, and the §5 approval gate. Every panel is fed by a real endpoint; a source
// that is down says so rather than showing a comfortable blank.
const $ = (s) => document.querySelector(s);
const CONFIRM_TTL = 45000;   // must track PENDING_MS in server.js
const LISTENER_STALE = 45000;

// ---------- boot ----------
const BOOT_STEPS = [
  ["os",       "/api/os",          (d) => {
      osStruct = d;
      return d.pillars.map((p) => `${p.name.split(" ")[0]} ${p.agents.length}`).join(" · ");
    }],
  ["core",     "/api/agents",      (d) => `${d.length} roles available`],
  ["mind",     "/api/mind-map",    (d) => `${d.nodes.length} nodes · ${d.edges.length} edges`],
  ["brain",    "/api/brain/stats", (d) => `${d.documents} docs · ${(d.words / 1000) | 0}k words`],
  ["links",    "/api/connections", (d) => {
      const v = Array.isArray(d) ? d : Object.values(d || {});
      const ok = v.filter((x) => (x.status || x) === "connected").length;
      return `${ok}/${v.length} connected`;
    }],
];
const bootLog = $("#boot-log");
function bootLine(label, text, cls = "") {
  const el = document.createElement("div");
  el.className = cls;
  el.textContent = `▸ ${label.padEnd(9)} ${text}`;
  bootLog.append(el);
}

let persona = { name: "JARVIS", accent: "#1A9FD1", boot: "JARVIS ONLINE", tagline: "" };
let agents = [];

async function boot() {
  try {
    const p = await (await fetch("/api/personas")).json();
    persona = p.personas[p.active] || persona;
    setPersonaChrome(p.active);
  } catch { /* personas are chrome; a failure must not block the deck */ }
  $("#boot-name").textContent = persona.boot || persona.name;
  $("#boot-tag").textContent = persona.tagline || "";
  $("#brand").textContent = "Paras AI 2.0";
  $("#jar-name").textContent = persona.name;

  for (const [label, url, fmt] of BOOT_STEPS) {
    try {
      const r = await fetch(url);
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error || "HTTP " + r.status);
      bootLine(label, fmt(d), "ok");
      if (label === "core") { agents = d; renderAgents(); }
      if (label === "mind") $("#t-mind").textContent = `mind ${d.nodes.length}n/${d.edges.length}e`;
    } catch (e) {
      bootLine(label, "FAILED — " + String(e.message || e).slice(0, 44), "no");
    }
    await new Promise((r) => setTimeout(r, 190));
  }
  bootLine("status", "deck ready");
  setTimeout(() => $("#boot").classList.add("done"), 700);
}

function setPersonaChrome(id) {
  const p = persona;
  if (p.accent) {
    document.documentElement.style.setProperty("--accent", p.accent);
    document.documentElement.style.setProperty("--accent-2", p.accent);
  }
  for (const b of document.querySelectorAll(".pill[data-p]"))
    b.setAttribute("aria-pressed", String(b.dataset.p === id));
}

for (const b of document.querySelectorAll(".pill[data-p]")) {
  b.addEventListener("click", async () => {
    const r = await fetch("/api/persona", { method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: b.dataset.p }) });
    if (!r.ok) return;
    const d = await r.json();
    persona = d.persona;
    setPersonaChrome(d.active);
    $("#brand").textContent = "Paras AI 2.0";
    $("#jar-name").textContent = persona.name;
    showJarvis(persona.tagline || persona.name + " online", "reply");
  });
}

// ---------- agents ----------
const agentEls = new Map();
let osStruct = null;

function agentRow(a, color) {
  const row = document.createElement("div");
  row.className = "agent";
  row.title = a.description || "";
  const dot = document.createElement("span");
  dot.className = "dot";
  if (color) dot.style.background = color;
  const nm = document.createElement("span");
  nm.className = "nm";
  nm.textContent = a.name;                        // textContent: roster comes off disk
  row.append(dot, nm);
  agentEls.set(a.id, row);
  return row;
}

/** Three pillars, in order, each with its own agents. Falls back to a flat list
 *  if /api/os is unavailable — a missing manifest must not blank the panel. */
function renderAgents() {
  const wrap = $("#agents");
  wrap.replaceChildren();
  $("#agent-count").textContent = "· " + agents.length;

  if (!osStruct || !osStruct.pillars) {
    for (const a of agents) wrap.append(agentRow(a));
    return;
  }
  for (const p of osStruct.pillars) {
    const head = document.createElement("div");
    head.className = "pillar-head";
    head.style.setProperty("--c", p.color);
    const t = document.createElement("span");
    t.className = "pt";
    t.textContent = `${p.icon} ${p.name}`;
    const n = document.createElement("span");
    n.className = "pn";
    n.textContent = p.agents.length;
    head.append(t, n);
    head.title = p.promise + (p.compliance ? "  ·  compliance-bound: " + p.compliance.rule : "");
    wrap.append(head);

    if (p.compliance) {                            // the constraint is visible, not buried
      const lock = document.createElement("div");
      lock.className = "pillar-lock";
      lock.textContent = "education & analysis only — no advice";
      wrap.append(lock);
    }
    for (const a of p.agents) if (a) wrap.append(agentRow(a, p.color));
  }
  const plat = agents.filter((a) => a.pillar === "platform");
  if (plat.length) {
    const head = document.createElement("div");
    head.className = "pillar-head";
    head.style.setProperty("--c", "#8B93A1");
    const t = document.createElement("span");
    t.className = "pt";
    t.textContent = "⬡ Platform";
    const n = document.createElement("span");
    n.className = "pn";
    n.textContent = plat.length;
    head.append(t, n);
    wrap.append(head);
    for (const a of plat) wrap.append(agentRow(a, "#8B93A1"));
  }
}
function heatAgent(id) {
  const row = agentEls.get(id);
  if (!row) return;                                // unknown agent: no fake highlight
  row.classList.add("hot");
  clearTimeout(row._t);
  row._t = setTimeout(() => row.classList.remove("hot"), 30000);
}

// ---------- today: routine health ----------
// A HUD that only shows what is running cannot show you what stopped. Four
// routines were dark for up to 19 days and no surface said a word, because
// nothing on the deck read ai-os/inbox/. Staleness is computed once in
// os_brain.py so this panel and the voice command can never disagree.
const ROUTINE_DOT = { ok: "live", late: "wait", dark: "down", never: "down" };

async function renderRoutines() {
  const wrap = $("#routines");
  const count = $("#routine-count");
  if (!wrap) return;
  wrap.textContent = "";
  try {
    const r = await fetch("/api/routines");
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || "HTTP " + r.status);
    const rows = d.routines || [];
    count.textContent = `${d.healthy}/${d.total} on time`;
    count.style.color = d.unhealthy ? "var(--err)" : "var(--muted)";
    for (const x of rows) {
      const el = document.createElement("div");
      el.className = "run" + (x.status === "ok" ? "" : " error");
      const w = document.createElement("div");
      w.className = "w";
      w.textContent = x.schedule;
      const head = document.createElement("div");
      const a = document.createElement("span");
      a.className = "a";
      const dot = document.createElement("span");
      dot.className = "dot " + (ROUTINE_DOT[x.status] || "down");
      a.append(dot, document.createTextNode(x.routine));
      head.append(a);
      const s = document.createElement("div");
      s.className = "s";
      s.textContent = x.note;
      el.append(w, head, s);
      wrap.append(el);
    }
    if (!rows.length) wrap.textContent = "no routines registered";
  } catch (e) {
    // Never render a calm blank here — an unknown schedule is itself a problem.
    count.textContent = "unavailable";
    count.style.color = "var(--err)";
    const el = document.createElement("div");
    el.className = "run error";
    el.textContent = "routine health unavailable — " + String(e.message || e).slice(0, 48);
    wrap.append(el);
  }
}
renderRoutines();
setInterval(renderRoutines, 300000);   // 5 min; the underlying data changes daily

// ---------- task feed ----------
function addRun(agent, summary, status = "") {
  const wrap = $("#runs");
  const el = document.createElement("div");
  el.className = "run" + (status === "error" ? " error" : "");
  const w = document.createElement("div");
  w.className = "w";
  w.textContent = new Date().toLocaleTimeString();
  const a = document.createElement("span");
  a.className = "a";
  a.textContent = agent;
  const s = document.createElement("div");
  s.className = "s";
  s.textContent = summary || "";
  const head = document.createElement("div");
  head.append(a);
  el.append(w, head, s);
  wrap.prepend(el);
  while (wrap.children.length > 40) wrap.lastChild.remove();
}
(async () => {
  try {
    const r = await fetch("/api/runs");
    const d = await r.json();
    for (const x of (Array.isArray(d) ? d : []).slice(0, 12).reverse())
      addRun(x.agent, x.summary, x.status);
  } catch { addRun("run log", "unavailable", "error"); }
})();

// ---------- transcript / reply ----------
function showYou(t) { const e = $("#you"); e.textContent = t; }
function showJarvis(t, kind) {
  const e = $("#jar");
  e.textContent = t;
  e.style.color = kind === "error" ? "var(--err)" : kind === "gate" ? "var(--warn)" : "";
}

// ---------- approval gate ----------
let pending = null, tickT = null;
function openGate(d) {
  pending = { id: d.pendingId };
  $("#g-act").textContent = d.summary || d.action || "gated action";
  $("#gate").classList.add("on");
  const ttl = d.expiresInMs || CONFIRM_TTL, t0 = Date.now();
  clearInterval(tickT);
  tickT = setInterval(() => {
    const left = Math.max(0, ttl - (Date.now() - t0));
    $("#g-secs").textContent = Math.ceil(left / 1000);
    $("#g-bar").style.width = (left / ttl * 100) + "%";
    if (left <= 0) closeGate("expired — nothing ran");
  }, 100);
}
function closeGate(msg) {
  clearInterval(tickT);
  pending = null;
  $("#gate").classList.remove("on");
  $("#g-yes").disabled = false;
  $("#g-yes").textContent = "CONFIRM";
  if (msg) showJarvis(msg, "reply");
}
$("#g-yes").addEventListener("click", async () => {
  if (!pending) return;
  const id = pending.id;
  clearInterval(tickT); pending = null;
  $("#g-yes").disabled = true; $("#g-yes").textContent = "RUNNING…";
  try {
    const r = await fetch("/voice-command/confirm", { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ pendingId: id }) });
    const d = await r.json().catch(() => ({}));
    closeGate(null);
    if (!r.ok || d.error) showJarvis("failed: " + (d.error || d.text || r.status), "error");
    else showJarvis(d.text || "done", "reply");
  } catch (e) { closeGate(null); showJarvis("backend unreachable", "error"); }
});
$("#g-no").addEventListener("click", () => {
  const id = pending?.id;
  closeGate("cancelled — nothing was executed");
  if (id) fetch("/voice-command/cancel", { method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pendingId: id }) }).catch(() => {});
});
addEventListener("keydown", (e) => { if (e.key === "Escape" && pending) $("#g-no").click(); });

// ---------- typed input: same path as the mic, same gate ----------
$("#ask").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const box = $("#askbox"), btn = $("#asksend");
  const text = box.value.trim();
  if (!text) return;
  box.value = ""; btn.disabled = true;
  showYou(text);
  showJarvis("…", "reply");
  try {
    const r = await fetch("/voice-command", { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ transcript: text }) });
    const d = await r.json().catch(() => ({}));
    if (!sseLive) route(d);                        // stream down: render it ourselves
  } catch (e) { showJarvis("backend unreachable", "error"); }
  finally { btn.disabled = false; box.focus(); }
});

// ---------- event routing (shared by SSE and the fallback above) ----------
function route(d) {
  const text = d.text || d.summary || "";
  switch (d.type) {
    case "transcript": if (d.text) showYou(d.text); break;
    case "confirm_required": case "awaiting_confirm":
      openGate(d);
      showJarvis(text, "gate");
      if (d.agent) heatAgent(d.agent);
      break;
    case "confirmed": break;
    case "dispatch": if (d.agent) { heatAgent(d.agent); addRun(d.agent, "dispatched"); } break;
    case "turn_done": if (d.agent) addRun(d.agent, "completed"); break;
    case "result": case "status": case "reply":
      showJarvis(text || "done", "reply");
      if (d.action) addRun(d.action.replace(/^dispatch:/, ""), text.slice(0, 90));
      break;
    case "cancelled": case "expired": closeGate(text || "cancelled"); break;
    case "unknown": showJarvis(text || "no command for that", "reply"); break;
    case "error": case "alert":
      showJarvis(text || "error", "error");
      if (d.agent) addRun(d.agent, text.slice(0, 90), "error");
      break;
    case "persona": showJarvis(d.name + " online", "reply"); break;
    case "listening": case "state": break;
  }
}

// ---------- observer stream ----------
let es = null, sseLive = false, retryMs = 1000, retryT = null, listenerAt = 0;
function setStrip() {
  $("#d-sse").className = "dot " + (sseLive ? "live" : retryT ? "wait" : "down");
  $("#t-sse").textContent = sseLive ? "stream live" : "stream down";
  const stale = listenerAt && Date.now() - listenerAt > LISTENER_STALE;
  $("#d-lis").className = "dot " + (!listenerAt ? "" : stale ? "wait" : "live");
  $("#t-lis").textContent = !listenerAt ? "listener unknown" : stale ? "listener quiet" : "listener online";
}
function connect() {
  if (es || document.hidden) return;
  es = new EventSource("/voice-events");
  es.onopen = () => { sseLive = true; retryMs = 1000; clearTimeout(retryT); retryT = null; setStrip(); };
  es.onmessage = (ev) => {
    let d; try { d = JSON.parse(ev.data); } catch { return; }
    // /voice-state is posted ONLY by the listener, and the server rebroadcasts it
    // as type "state" — that is the single honest proof the ear is alive.
    if (d.type === "state" || d.type === "voice_state" || d.type === "listening")
      listenerAt = Date.now();
    route(d);
    setStrip();
  };
  es.onerror = () => {
    sseLive = false; es.close(); es = null;
    clearTimeout(retryT);
    retryT = setTimeout(connect, retryMs);
    retryMs = Math.min(15000, retryMs * 2);
    setStrip();
  };
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { es?.close(); es = null; sseLive = false; clearTimeout(retryT); }
  else connect();
});
setInterval(setStrip, 1000);
connect();
boot();

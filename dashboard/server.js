const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { resolvePython } = require("../scripts/python-runtime.cjs");
const operations = require("../scripts/ops.cjs");
const brain = require("../scripts/brain.cjs");

const app = express();

const AUTH_USER = process.env.DASHBOARD_USER;
const AUTH_PASS = process.env.DASHBOARD_PASS;
if (AUTH_USER && AUTH_PASS) {
  app.use((req, res, next) => {
    const hdr = req.headers.authorization || "";
    const [scheme, encoded] = hdr.split(" ");
    if (scheme === "Basic" && encoded) {
      const [u, p] = Buffer.from(encoded, "base64").toString().split(":");
      if (u === AUTH_USER && p === AUTH_PASS) return next();
    }
    res.set("WWW-Authenticate", 'Basic realm="Paras AI 2.0"');
    res.status(401).send("Authentication required");
  });
} else {
  console.warn("WARNING: DASHBOARD_USER/DASHBOARD_PASS not set — dashboard is UNAUTHENTICATED. Fine for localhost only; required before deploying publicly.");
}

app.use(express.json());
// Public assets only. Do not serve server code, lockfiles, logs or configuration.
app.use((req, res, next) => {
  if (!['GET', 'HEAD'].includes(req.method) || req.path.startsWith('/api/') || req.path.startsWith('/voice-command')) return next();
  const allowed = /^\/(?:index\.html|jarvis\.html)?$/.test(req.path) || /^\/(?:ultron|mind|os)(?:\/|$)/.test(req.path);
  if (!allowed || /(?:^|\/)\./.test(req.path)) return res.sendStatus(404);
  next();
});
// No caching for the console's own assets. This dashboard changes constantly and
// ES modules cache aggressively — a stale deck.js looks exactly like a broken
// backend (buttons that "do nothing"), which is the worst thing to debug.
app.use(express.static(__dirname, {
  etag: false,
  lastModified: false,
  setHeaders: (res, filePath) => {
    if (/\.(html|js|css|json)$/i.test(filePath)) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
    }
  },
}));

const ROOT = path.join(__dirname, "..");
const MODEL = process.env.MODEL;
const KEY = process.env.ANTHROPIC_API_KEY;
// Linux/containers ship "python3"; Windows dev boxes ship "python". Pick per platform.
let PY;
try { PY = resolvePython(); }
catch (e) { PY = process.env.PYTHON || "python"; console.warn(e.message); }
const TOOLS = path.join(ROOT, "ai-os", "tools");

function readSafe(p) { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } }

// Current business decisions and local readiness. No network or mutation.
app.get("/api/operations", (_req, res) => {
  try { res.json(operations.snapshot()); }
  catch (e) { res.status(503).json({ error: "Operating snapshot unavailable: " + e.message }); }
});
app.get("/api/memory", (_req, res) => {
  try { res.json(brain.status()); }
  catch { res.status(503).json({ error: "Local memory status unavailable" }); }
});

/** Run one of the OS python tools and parse its --json output.
 *  Never throws: a broken tool reports honestly instead of blanking the UI. */
function runTool(script, args, cb) {
  execFile(PY, [path.join(TOOLS, script), ...args], { timeout: 30000, cwd: ROOT },
    (err, stdout, stderr) => {
      if (err && !stdout) {
        // Surface WHY. "Command failed" alone sent us hunting a phantom timeout
        // when the real cause was in stderr the whole time.
        const why = [
          err.code !== undefined && err.code !== null ? "exit " + err.code : null,
          err.signal ? "signal " + err.signal : null,
          (stderr || "").trim().split("\n").slice(-3).join(" | ").slice(0, 300) || null,
        ].filter(Boolean).join(" · ");
        return cb({ error: `${script}: ${why || String(err).slice(0, 160)}` });
      }
      try { cb(JSON.parse(stdout)); }
      catch { cb({ error: `${script}: unparseable output — ${String(stdout).slice(0, 120)}` }); }
    });
}

// ---- Agent roster: read from the real .claude/agents dir, never a seeded list ----
// ---- OS structure: three pillars + the platform they run on ----
// Read fresh each call. The manifest is the single source of truth; a hardcoded
// pillar list here would drift the moment an agent is added.
function osManifest() {
  try { return JSON.parse(readSafe(path.join(ROOT, "ai-os", "os-manifest.json"))); }
  catch { return null; }
}

/** agentId -> { pillar, name, color } for everything the manifest places. */
function pillarIndex() {
  const m = osManifest();
  const idx = {};
  if (!m) return idx;
  for (const [id, p] of Object.entries(m.pillars || {}))
    for (const a of p.agents || []) idx[a] = { pillar: id, pillarName: p.name, color: p.color };
  const plat = m.platform || {};
  for (const a of [plat.conductor, ...(plat.executors || []), ...(plat.builders || [])])
    if (a) idx[a] = { pillar: "platform", pillarName: "Platform", color: "#8B93A1" };
  return idx;
}

app.get("/api/os", (_req, res) => {
  const m = osManifest();
  if (!m) return res.status(500).json({ error: "os-manifest.json missing or unparseable" });
  const roster = agentRoster();
  const have = new Set(roster.map((a) => a.id));
  const out = { name: m.name, tagline: m.tagline, pillars: [], platform: m.platform, install: m.install };
  for (const [id, p] of Object.entries(m.pillars)) {
    // Report what EXISTS, and name what the manifest claims but disk doesn't have.
    const present = (p.agents || []).filter((a) => have.has(a));
    const missing = (p.agents || []).filter((a) => !have.has(a));
    out.pillars.push({
      id, name: p.name, order: p.order, color: p.color, icon: p.icon,
      promise: p.promise, job: p.job, north_star: p.north_star,
      entry_agent: p.entry_agent, runs_on: p.runs_on,
      compliance: p.compliance ? { binding: !!p.compliance.binding, rule: p.compliance.rule } : null,
      agents: present.map((a) => roster.find((r) => r.id === a)),
      missing,
    });
  }
  out.pillars.sort((a, b) => a.order - b.order);
  const placed = new Set(Object.keys(pillarIndex()));
  out.unassigned = roster.filter((a) => !placed.has(a.id)).map((a) => a.id);
  res.json(out);
});

function agentRoster() {
  const dir = path.join(ROOT, ".claude", "agents");
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")); } catch { return []; }
  // Read the pillar map per call, not once at boot. This used to be a module-level
  // const, so editing os-manifest.json left /api/agents stamping agents from a
  // stale map until someone restarted the server — and the deck's Platform group
  // (deck.js filters a.pillar === "platform") silently lost every newly added
  // agent. /api/os re-read the manifest and looked fine, so nothing flagged it.
  // We already read 53 files off disk here; one JSON.parse alongside is free.
  const PILLARS = pillarIndex();
  return files.map((f) => {
    const raw = readSafe(path.join(dir, f));
    const name = f.replace(/\.md$/, "");
    const dm = raw.match(/^description:\s*(.+)$/m);
    const desc = (dm ? dm[1] : raw.split("\n").find((l) => l.trim() && !l.startsWith("-") && !l.startsWith("#")) || "").trim();
    return { id: name, name, description: desc.replace(/^["']|["']$/g, "").slice(0, 190) };
  }).map((a) => {
    const p = PILLARS[a.id];
    return p ? { ...a, pillar: p.pillar, pillarName: p.pillarName, color: p.color } : a;
  }).sort((a, b) => a.id.localeCompare(b.id));
}

app.get("/api/agents", (_req, res) => res.json(agentRoster()));

// ---- Honest connection status (connected | not_configured | error) ----
app.get("/api/connections", (_req, res) =>
  runTool("check_connections.py", ["--json"], (out) => res.json(out)));

// ---- Routine health: what the scheduled routines last wrote, and how long ago ----
// The deck showed only what was RUNNING, never what had STOPPED — so four routines
// went dark for up to 19 days with no visible symptom anywhere. Same os_brain.py
// call backs the voice command, so there is exactly one staleness rule.
app.get("/api/routines", (_req, res) =>
  runTool("os_brain.py", ["routines", "--json"], (out) => res.json(out)));

// ---- Shared brain: corpus stats + search across all OS markdown ----
app.get("/api/brain/stats", (_req, res) =>
  runTool("os_brain.py", ["stats", "--json"], (out) => res.json(out)));

app.get("/api/brain/search", (req, res) => {
  const q = (req.query.q || "").toString().slice(0, 200);
  if (!q) return res.json([]);
  runTool("os_brain.py", ["search", q, "--json"], (out) => res.json(out));
});

// ---- Mind map (the Living Mind page's data layer) ----
// Skeleton is assembled by mind_map.py (regions/nodes/edges/stats, every source
// isolated). Cold build embeds the corpus (~1-2 min once); embeddings are cached
// in an npz after that, so we allow a long timeout and memoize for 60s.
let mindCache = null, mindCacheAt = 0, mindInflight = null;
app.get("/api/mind-map", (_req, res) => {
  if (mindCache && Date.now() - mindCacheAt < 60000) return res.json(mindCache);
  if (!mindInflight) {
    mindInflight = new Promise((resolve) => {
      execFile(PY, [path.join(TOOLS, "mind_map.py"), "build"],
        { timeout: 180000, cwd: ROOT, maxBuffer: 32 * 1024 * 1024,
          env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" } },
        (err, stdout, stderr) => {
          mindInflight = null;
          if (err && !stdout) {
            const why = [
              err.code !== undefined && err.code !== null ? "exit " + err.code : null,
              err.signal ? "signal " + err.signal : null,
              (stderr || "").trim().split("\n").slice(-4).join(" | ").slice(0, 400) || null,
            ].filter(Boolean).join(" · ");
            return resolve({ error: "mind_map.py: " + (why || String(err).slice(0, 160)) });
          }
          try { mindCache = JSON.parse(stdout); mindCacheAt = Date.now(); resolve(mindCache); }
          catch (e) {
            resolve({ error: "mind_map.py: unparseable output — " +
              String(stdout).slice(0, 150) + (stderr ? " | stderr: " + stderr.slice(-200) : "") });
          }
        });
    });
  }
  mindInflight.then((out) => res.status(out.error ? 500 : 200).json(out));
});

app.get("/api/mind-map/node/:id", (req, res) => {
  const id = String(req.params.id || "");
  if (!/^[A-Za-z0-9:._-]{1,80}$/.test(id)) return res.status(400).json({ error: "bad id" });
  execFile(PY, [path.join(TOOLS, "mind_map.py"), "node", id],
    { timeout: 30000, cwd: ROOT, maxBuffer: 2 * 1024 * 1024 },
    (err, stdout) => {
      try {
        const d = JSON.parse(stdout);
        res.status(d.error ? 404 : 200).json(d);
      } catch { res.status(500).json({ error: (String(err) || "tool failed").slice(0, 200) }); }
    });
});

// ---- Agent run log (observability = prerequisite for autonomy) ----
app.get("/api/runs", (_req, res) =>
  runTool("os_brain.py", ["runs", "40", "--json"], (out) => res.json(out)));

function logRun(agent, status, summary) {
  execFile(PY, [path.join(TOOLS, "os_brain.py"), "log", agent, status, summary],
    { timeout: 15000, cwd: ROOT }, () => {});
}

// ---- Run an agent. THE single agent-execution path — /run and the voice layer
//      both call this, so approval/compliance/logging can never diverge.
//      Returns { agent, model, text } or { error, status }; never throws. ----
async function runAgent(agent, task, history) {
  if (typeof agent !== "string" || !/^[a-z0-9-]+$/.test(agent)) return { error: "invalid agent id", status: 400 };
  if (typeof task !== "string" || !task.trim()) return { error: "task is required", status: 400 };
  const agentDef = readSafe(path.join(ROOT, ".claude", "agents", agent + ".md"));
  if (!agentDef) return { error: "unknown agent: " + agent, status: 404 };

  const constitution = readSafe(path.join(ROOT, "CLAUDE.md"));
  const context = readSafe(path.join(ROOT, "ai-os", "agent-context.md"));
  const currentPlan = readSafe(path.join(ROOT, "ai-os", "CURRENT-PLAN.md"));
  const memoryIndex = readSafe(path.join(ROOT, "MEMORY.md"));
  const vision = readSafe(path.join(ROOT, "ai-os", "VISION.md"));
  const lastSession = readSafe(path.join(ROOT, "memory", "last-session.md"));
  let currentState;
  try {
    const s = operations.snapshot();
    currentState = JSON.stringify({ as_of:s.as_of, metrics:s.metrics, due:s.due, overdue:s.overdue,
      blockers:s.blockers, execution_mode:s.execution_mode });
  } catch (e) { currentState = "Local operating snapshot unavailable. Do not invent current metrics."; }

  const system = [
    "You are a specialist agent inside Paras's AI OS. Obey this constitution and context strictly, especially the compliance rules: education only; NO income/return/guarantee claims; trading = portfolio skills only, never buy/sell signals.",
    "=== CONSTITUTION (CLAUDE.md) ===\n" + constitution,
    "=== SHARED CONTEXT ===\n" + context,
    "=== PARAS AI 2.0 VISION ===\n" + vision,
    "=== CURATED MEMORY INDEX ===\n" + memoryIndex,
    "=== LAST RECORDED SESSION (dated; not live status) ===\n" + lastSession,
    "=== CURRENT USER-DEFINED PLAN (supersedes older strategy locks) ===\n" + currentPlan,
    "=== DATED LOCAL SNAPSHOT (not a live CRM/payment sync) ===\n" + currentState,
    "=== YOUR AGENT DEFINITION ===\n" + agentDef,
    "Produce the deliverable directly and concretely. This is a draft/plan surface: do NOT claim to have sent messages, spent money, or taken external actions. If the task would require sending or spending, produce the draft and add a line that it needs Paras's approval before it goes out.",
  ].join("\n\n");

  const priorTurns = Array.isArray(history)
    ? history.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string").slice(-40)
    : [];
  const messages = [...priorTurns, { role: "user", content: task }];

  if (!KEY) {
    logRun(agent, "error", "ANTHROPIC_API_KEY not set");
    return { error: "ANTHROPIC_API_KEY not set on the server", status: 500 };
  }
  if (!MODEL) return { error: "Set MODEL to a model supported by your configured provider account", status: 503 };

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 3000, system, messages }),
    });
    const d = await r.json();
    if (d.error) {
      logRun(agent, "error", (d.error.message || "api error").slice(0, 150));
      return { error: d.error.message || "api error", status: 500 };
    }
    const text = (d.content || []).map((b) => b.text || "").join("\n").trim();
    logRun(agent, "success", task.slice(0, 150));
    return { agent, model: d.model, text };
  } catch (e) {
    logRun(agent, "error", String(e).slice(0, 150));
    return { error: String(e), status: 500 };
  }
}

app.post("/run", async (req, res) => {
  const { agent, task, history } = req.body || {};
  if (!agent || !task) return res.status(400).json({ error: "agent and task are required" });
  push({ type: "dispatch", agent });                 // the mind map watches this
  const out = await runAgent(agent, task, history);
  push(out.error ? { type: "alert", agent } : { type: "turn_done", agent });
  if (out.error) return res.status(out.status).json({ error: out.error });
  res.json(out);
});

// =====================================================================
//  JARVIS voice layer
//  Voice is a low-confidence input channel (mis-transcription is normal),
//  so: a strict whitelist decides what CAN run, and anything that costs
//  money or leaves the building waits for a separate explicit confirm.
// =====================================================================

const REGISTRY = (() => {
  try { return JSON.parse(readSafe(path.join(__dirname, "voice-commands.json"))).commands || []; }
  catch { console.error("voice-commands.json missing or invalid — voice layer disabled"); return []; }
})();

// ---- HUD live feed (SSE: one-directional server->client is all the HUD needs) ----
const hudClients = new Set();
function push(evt) {
  const line = "data: " + JSON.stringify({ ts: Date.now(), ...evt }) + "\n\n";
  for (const c of hudClients) { try { c.write(line); } catch { hudClients.delete(c); } }
}

app.get("/voice-events", (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders();
  res.write("retry: 3000\n\n");
  hudClients.add(res);
  push({ type: "state", state: "idle" });
  const ka = setInterval(() => { try { res.write(": keepalive\n\n"); } catch {} }, 25000); // proxies drop idle streams
  req.on("close", () => { clearInterval(ka); hudClients.delete(res); });
});

/** Answer the HTTP caller (listener.py, for TTS) and the HUD with the same payload. */
function voiceReply(res, payload, code) {
  push(payload);
  res.status(code || 200).json(payload);
}

// ---- Pending gated actions: in-memory, single-use, hard expiry ----
// 45s, not 20s. This clock starts inside createPending — BEFORE the response is
// even written — while the listener only starts waiting after the network round
// trip, a cold PowerShell SAPI spawn (~1.5-3s) and 6-7s of spoken summary. At
// 20s the first spoken "yes" landed around t+15s and any retry was already
// expired, which read as "the gate is broken" rather than "the window is short".
const PENDING_MS = 45000;
const pending = new Map();

function createPending(entry, params) {
  const pendingId = crypto.randomUUID();
  pending.set(pendingId, { entry, params, expires: Date.now() + PENDING_MS });
  return pendingId;
}

/** Consume a pending action. Deletes FIRST so a replay (or a double-confirm race)
 *  can never execute twice, and re-checks expiry here — the sweeper is a janitor,
 *  not the enforcement point. */
function takePending(id) {
  const p = pending.get(id);
  if (!p) return null;
  pending.delete(id);
  return p.expires > Date.now() ? p : null;
}

setInterval(() => {
  for (const [id, p] of pending) {
    if (p.expires <= Date.now()) { pending.delete(id); push({ type: "expired", pendingId: id, summary: p.entry.summary }); }
  }
}, 2000).unref(); // unref: the sweeper must never keep the process alive (or block the test runner)

// ---- Templating + read-only executors ----
const fill = (tpl, vals) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (k in vals ? String(vals[k]) : m));
const runToolAsync = (script, args) => new Promise((r) => runTool(script, args, r));
// Markdown read aloud is noise — flatten it before anything reaches TTS.
const plain = (s) => String(s || "").replace(/[#*`>_|]+/g, " ").replace(/\s+/g, " ").trim();
const clip = (s, n) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s);

/** One summarizer per read_only command id: raw tool JSON -> flat facts for its
 *  reply template. Speech needs "3 of 8", which a pure string template can't say. */
// ---- Personas: tone only. A persona NEVER changes what is allowed to run. ----
const PERSONAS = (() => {
  try { return JSON.parse(readSafe(path.join(__dirname, "personas.json"))); }
  catch { return { default: "jarvis", personas: {} }; }
})();
let activePersona = PERSONAS.default;
function persona() {
  return PERSONAS.personas[activePersona] || { name: "JARVIS", style: [], voice: "neutral" };
}
app.get("/api/personas", (_req, res) =>
  res.json({ active: activePersona, personas: PERSONAS.personas }));
app.post("/api/persona", (req, res) => {
  const id = String((req.body || {}).id || "");
  if (!PERSONAS.personas[id]) return res.status(400).json({ error: "unknown persona" });
  activePersona = id;
  push({ type: "persona", id, name: persona().name, accent: persona().accent });
  res.json({ active: id, persona: persona() });
});

/** Free-speech routing: when the transcript matches NO whitelisted command,
 *  ask the model to pick one of the real agents and phrase the task. This never
 *  executes anything — it returns a proposal that still passes the §5 gate. */
async function converse(transcript) {
  const roster = agentRoster();
  if (!roster.length) return null;
  const p = persona();
  const system = [
    `You are ${p.name}, the voice of Paras's AI OS. Tone: ${p.voice}.`,
    ...p.style.map((s) => "- " + s),
    "",
    "The operator said something that is not one of the fixed commands. Decide whether one of",
    "the REAL agents below should handle it, and write the task brief for that agent.",
    'Answer with JSON only: {"agent":"<id from the list or none>","task":"<one clear instruction>","say":"<your spoken reply, max 2 sentences, in character>"}',
    'Use "none" for chat, questions about yourself, or anything no listed agent covers — then just answer in "say".',
    "Never invent an agent id. Never promise that something has been done: nothing runs until the operator confirms.",
    "AGENTS:\n" + roster.map((a) => `- ${a.id}: ${a.description}`).join("\n"),
  ].join("\n");

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    // no `temperature`: deprecated on this model tier and rejected outright
    body: JSON.stringify({ model: MODEL, max_tokens: 400, system,
      messages: [{ role: "user", content: transcript }] }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || "api error");
  const raw = (d.content || []).map((b) => b.text || "").join("");
  const m = raw.match(/\{[\s\S]*\}/);
  let parsed = {};
  try { parsed = m ? JSON.parse(m[0]) : {}; } catch { parsed = {}; }
  const agent = roster.find((a) => a.id === parsed.agent);   // hard check against the real roster
  const say = typeof parsed.say === "string" ? parsed.say.slice(0, 400) : "";
  const task = typeof parsed.task === "string" ? parsed.task.slice(0, 600) : "";
  if (!agent || !task) return { agent: null, say: say || "I don't have anything for that." };
  return { agent: agent.id, task, say };
}

const SUMMARIZE = {
  system_status: (d) => {
    const a = Array.isArray(d) ? d : [];
    const bad = a.filter((x) => x.status !== "connected");
    return { total: a.length, connected: a.length - bad.length, issues: bad.length ? bad.map((x) => x.name).join(", ") : "nothing" };
  },
  agent_roster: (d) => ({ count: d.length, sample: d.slice(0, 3).map((a) => a.name).join(", ") || "none" }),
  recent_runs: (d) => {
    const r = d[0] || {};
    return { count: d.length, agent: r.agent || "nobody", status: r.status || "no status", summary: r.summary || "nothing logged yet" };
  },
  brain_stats: (d) => ({
    documents: d.documents || 0,
    words: Math.round((d.words || 0) / 1000) + " thousand",
    sources: Object.keys(d.by_source || {}).length,
  }),
  brain_search: (d) => {
    const h = (Array.isArray(d) ? d : [])[0];
    return h ? { file: path.basename(h.path), snippet: clip(plain(h.snippet), 180) } : { file: "nothing", snippet: "I found no match in the brain." };
  },
};

async function execReadOnly(entry, params) {
  if (entry.run.builtin === "agents") return agentRoster();
  return runToolAsync(entry.run.tool, (entry.run.args || []).map((a) => fill(a, params)));
}

// ---- Classifier: picks a registry id, nothing else ----
/** The model's ONLY job is to choose an existing id. Its answer is then checked
 *  against the registry, so it can never name an action that does not exist. */
async function classify(transcript) {
  const list = REGISTRY.map((c) => {
    const p = c.params ? " | params: " + Object.entries(c.params).map(([k, v]) => `${k} (${v})`).join("; ") : "";
    return `- ${c.id}: ${c.description} e.g. "${(c.phrases || [])[0] || ""}"${p}`;
  }).join("\n");

  const system = [
    "You route a voice transcript to ONE command from a fixed list. You do not perform, plan, or invent actions.",
    'Answer with JSON only: {"id": "<one id from the list or none>", "params": {...}}',
    'Use "none" whenever the transcript does not clearly mean one of the listed commands. Guessing is worse than "none".',
    "Fill params only if the command declares them; take the values from the transcript's own words, never invent them.",
    "COMMANDS:\n" + list,
  ].join("\n");

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 300, system, messages: [{ role: "user", content: transcript }] }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || "api error");
  const raw = (d.content || []).map((b) => b.text || "").join("");
  const m = raw.match(/\{[\s\S]*\}/);
  let parsed = {};
  try { parsed = m ? JSON.parse(m[0]) : {}; } catch { parsed = {}; }

  const entry = REGISTRY.find((c) => c.id === parsed.id); // hard whitelist check on model output
  if (!entry) return { entry: null, params: {} };
  const params = {};
  for (const key of Object.keys(entry.params || {})) {
    const v = parsed.params && parsed.params[key];
    if (typeof v === "string" && v.trim()) params[key] = v.trim().slice(0, 400); // declared keys only
  }
  return { entry, params };
}

app.post("/voice-command", async (req, res) => {
  const transcript = typeof (req.body || {}).transcript === "string" ? req.body.transcript.trim().slice(0, 500) : "";
  if (!transcript) return voiceReply(res, { type: "error", text: "I didn't catch that. Say it again." }, 400);
  push({ type: "transcript", text: transcript });

  if (!KEY) return voiceReply(res, { type: "error", text: "I can't reach my brain — the API key isn't set on the server." }, 500);
  if (!REGISTRY.length) return voiceReply(res, { type: "error", text: "My command list failed to load. Nothing can run." }, 500);

  let entry, params;
  try { ({ entry, params } = await classify(transcript)); }
  catch (e) {
    logRun("jarvis", "error", ("classify: " + e).slice(0, 150));
    return voiceReply(res, { type: "error", text: "I couldn't work out what you meant — something went wrong on my end." }, 500);
  }

  if (!entry) {
    // No whitelisted command matched — fall through to free-speech routing.
    // Still executes nothing: a proposed dispatch becomes a normal §5 gate.
    let c = null;
    try { c = await converse(transcript); }
    catch (e) {
      logRun("jarvis", "error", ("converse: " + e).slice(0, 150));
      return voiceReply(res, { type: "error", transcript,
        text: "I couldn't reach my brain for that one." }, 500);
    }
    if (!c) return voiceReply(res, { type: "unknown", transcript,
      text: "I don't have a command for that yet." });
    if (!c.agent) return voiceReply(res, { type: "reply", transcript, text: c.say });

    const synthetic = {
      id: "dispatch:" + c.agent,
      summary: `dispatch ${c.agent} — ${c.task}`,
      run: { agent: c.agent, task: c.task },
      reply: "{preview}",
      params: {},
    };
    const pendingId = createPending(synthetic, {});
    return voiceReply(res, {
      type: "confirm_required", pendingId, action: synthetic.id,
      agent: c.agent, task: c.task, summary: synthetic.summary,
      expiresInMs: PENDING_MS,
      text: c.say + " Confirm to run it.",
    });
  }

  const missing = Object.keys(entry.params || {}).filter((k) => !params[k]);
  if (missing.length) return voiceReply(res, { type: "unknown", transcript, text: "I need a bit more for that — say it again with the details." });

  if (entry.type === "read_only") {
    const data = await execReadOnly(entry, params);
    if (data && data.error) return voiceReply(res, { type: "error", text: "That check failed: " + data.error }, 500);
    const facts = { ...params, ...(SUMMARIZE[entry.id] ? SUMMARIZE[entry.id](data) : {}) };
    return voiceReply(res, { type: "status", id: entry.id, text: fill(entry.reply, facts), data });
  }

  // gated: hold it, execute NOTHING until an explicit confirm arrives
  const pendingId = createPending(entry, params);
  voiceReply(res, {
    type: "confirm_required",
    pendingId,
    action: entry.id,
    summary: entry.summary,
    expiresInMs: PENDING_MS,
    text: entry.summary + ". Say confirm to go ahead.",
  });
});

app.post("/voice-command/confirm", async (req, res) => {
  const id = typeof (req.body || {}).pendingId === "string" ? req.body.pendingId.slice(0, 64) : "";
  const p = id && takePending(id);
  if (!p) return voiceReply(res, { type: "expired", pendingId: id, text: "That request expired — nothing was run. Say it again if you still want it." });

  push({ type: "confirmed", pendingId: id, action: p.entry.id, summary: p.entry.summary });
  const out = await runAgent(p.entry.run.agent, fill(p.entry.run.task, p.params));
  if (out.error) return voiceReply(res, { type: "error", pendingId: id, text: "That failed: " + out.error }, 500);
  const facts = { ...p.params, preview: clip(plain(out.text), 220) };
  archiveRun(p.entry, out.text);
  voiceReply(res, { type: "result", pendingId: id, action: p.entry.id, text: fill(p.entry.reply, facts), data: out });
});

/** Append a confirmed gated run to the inbox so the work survives the sentence.
 *  Every brief Jarvis has ever spoken was lost the moment the audio stopped —
 *  the server had no writeFile at all. The path is built from the date and the
 *  registry id ONLY: a transcript is untrusted input and must never reach it. */
function archiveRun(entry, text) {
  if (!text) return;
  try {
    const day = new Date().toISOString().slice(0, 10);
    const slug = String(entry.id).replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "voice";
    const file = path.join(ROOT, "ai-os", "inbox", `${day}-${slug}.md`);
    const head = fs.existsSync(file) ? "" : `# ${entry.summary || entry.id} — ${day}\n`;
    fs.appendFileSync(file, `${head}\n## ${new Date().toTimeString().slice(0, 5)} · confirmed via voice\n\n${text}\n`);
  } catch (e) {
    // Never fail a completed run because the archive write failed — the work
    // already happened; losing the file is worse reported than pretended away.
    console.error("archive failed:", e.message);
  }
}

app.post("/voice-command/cancel", (req, res) => {
  const id = typeof (req.body || {}).pendingId === "string" ? req.body.pendingId.slice(0, 64) : "";
  const p = id && takePending(id);
  voiceReply(res, { type: "cancelled", pendingId: id, text: p ? "Cancelled. Nothing was run." : "Nothing pending to cancel." });
});

// ---- Listener reports its own mic state so the HUD can show it ----
app.post("/voice-state", (req, res) => {
  const state = String((req.body || {}).state || "");
  // "confirming" and "offline" are both sent by jarvis/listener.py; rejecting
  // them with a 400 meant the HUD never saw a gate open and never learned the
  // listener had shut down — it just went stale and kept showing a calm lie.
  if (!["idle", "listening", "recording", "thinking", "speaking", "confirming", "offline", "error"].includes(state)) return res.status(400).json({ error: "unknown state" });
  push({ type: "state", state, detail: String((req.body || {}).detail || "").slice(0, 200) });
  res.json({ ok: true });
});

// ---- Resilience: a bad request must never take the console down ----
// Express 4 does not catch rejections from async handlers, so one upstream
// hiccup inside an `await` would otherwise kill the process. The console is
// the thing being demoed and voice-controlled; staying up matters more than
// failing fast.
app.use((err, _req, res, _next) => {
  console.error("[error]", (err && err.stack ? err.stack : String(err)).slice(0, 500));
  if (res.headersSent) return;
  res.status(500).json({ error: "server error: " + String(err && err.message || err).slice(0, 200) });
});

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", String(reason && reason.stack || reason).slice(0, 500));
});
process.on("uncaughtException", (err) => {
  // Log and keep serving. A crashed dashboard is worse than a degraded one —
  // the supervisor in Start-Dashboard.bat is the backstop if state is truly lost.
  console.error("[uncaughtException]", String(err && err.stack || err).slice(0, 500));
});

const PORT = process.env.PORT || 8080;
// Guarded so test-voice.js can require this file for the pure logic without booting a server.
if (require.main === module) {
  // Without credentials bind only to loopback. Remote hosting must configure auth.
  const host = (AUTH_USER && AUTH_PASS) ? (process.env.HOST || "0.0.0.0") : "127.0.0.1";
  const server = app.listen(PORT, host, () =>
    console.log("Paras AI 2.0 dashboard live on http://localhost:" + PORT));
  server.on("error", (e) => {
    if (e.code === "EADDRINUSE") {
      console.error(`[fatal] port ${PORT} already in use — another dashboard is running. ` +
        `Close it, or set PORT to something else.`);
      process.exit(1);            // a clear message beats a silent second instance
    }
    throw e;
  });
  server.keepAliveTimeout = 65000; // agent runs are long; don't drop them mid-flight
  server.headersTimeout = 70000;
}

module.exports = { app, runAgent, REGISTRY, SUMMARIZE, fill, clip, pending, createPending, takePending, PENDING_MS };

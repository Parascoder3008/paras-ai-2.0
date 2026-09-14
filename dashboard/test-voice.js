// Self-check for the voice layer's pure logic: registry shape + pending-action
// lifecycle. No mic, no network, no framework — `node test-voice.js`.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { REGISTRY, SUMMARIZE, fill, clip, pending, createPending, takePending, PENDING_MS } = require("./server");

const ok = [];
const t = (name, fn) => { fn(); ok.push(name); };

// ---- registry is a sane, honest whitelist ----
t("registry loads", () => assert(REGISTRY.length >= 5, "registry should have entries"));

t("ids are unique and typed", () => {
  const seen = new Set();
  for (const c of REGISTRY) {
    assert(c.id && !seen.has(c.id), "duplicate or missing id: " + c.id);
    seen.add(c.id);
    assert(["read_only", "gated"].includes(c.type), c.id + " has a bogus type");
    assert(c.description && c.reply, c.id + " needs a description and a reply template");
  }
});

t("read_only entries are runnable and speakable", () => {
  for (const c of REGISTRY.filter((x) => x.type === "read_only")) {
    assert(c.run.builtin || c.run.tool, c.id + " has nothing to run");
    if (c.run.tool) assert(fs.existsSync(path.join(__dirname, "..", "ai-os", "tools", c.run.tool)), c.id + " points at a missing tool: " + c.run.tool);
    assert(typeof SUMMARIZE[c.id] === "function", c.id + " has no summarizer — its reply template could never be filled");
  }
});

t("gated entries map to real agents and explain their gate", () => {
  for (const c of REGISTRY.filter((x) => x.type === "gated")) {
    assert(c.run.agent && c.run.task, c.id + " needs run.agent + run.task");
    assert(fs.existsSync(path.join(__dirname, "..", ".claude", "agents", c.run.agent + ".md")), c.id + " points at a non-existent agent: " + c.run.agent);
    assert(c.summary && c.gate_reason, c.id + " needs a spoken summary and a gate_reason");
  }
});

// CLAUDE.md §5: sends / money / publishing / ad spend never auto-fire.
// Judge what a command DOES (its trigger phrases + run target), not prose that
// merely names an integration — system_status probes AiSensy without sending.
t("nothing on the send, money or publish path is read_only", () => {
  const danger = /\b(send|sends|broadcast|message|publish|posts?|pay|charge|refund|spend|budget)\b/i;
  for (const c of REGISTRY.filter((x) => x.type === "read_only")) {
    const surface = (c.phrases || []).join(" ") + " " + JSON.stringify(c.run);
    assert(!danger.test(surface), c.id + " looks like a §5 gated action but is marked read_only");
    assert(!c.run.agent, c.id + " runs an agent, which must be gated");
  }
});

// ---- templating ----
t("fill substitutes declared keys and leaves unknown ones alone", () => {
  assert.strictEqual(fill("search {query} now", { query: "churn" }), "search churn now");
  assert.strictEqual(fill("hi {nope}", {}), "hi {nope}");
  assert.strictEqual(fill("{a}/{b}", { a: 1, b: 2 }), "1/2");
});

t("clip shortens long text for TTS", () => {
  assert.strictEqual(clip("short", 50), "short");
  assert(clip("x".repeat(300), 100).length <= 101);
});

// ---- pending-action lifecycle: the approval gate itself ----
const gated = REGISTRY.find((c) => c.type === "gated");

t("creating a pending action stores it and executes nothing", () => {
  const before = pending.size;
  const id = createPending(gated, { brief: "test" });
  assert.strictEqual(pending.size, before + 1);
  assert.strictEqual(pending.get(id).entry, gated);
  assert.deepStrictEqual(pending.get(id).params, { brief: "test" });
  assert(pending.get(id).expires > Date.now() && pending.get(id).expires <= Date.now() + PENDING_MS);
  pending.delete(id);
});

t("confirm is single-use — a replay cannot double-execute", () => {
  const id = createPending(gated, {});
  assert.strictEqual(takePending(id).entry, gated);
  assert.strictEqual(takePending(id), null, "second confirm must return nothing");
  assert.strictEqual(pending.has(id), false);
});

t("expired actions are refused and consumed, not run", () => {
  const id = createPending(gated, {});
  pending.get(id).expires = Date.now() - 1; // simulate the 20s window closing
  assert.strictEqual(takePending(id), null, "an expired action must never be returned for execution");
  assert.strictEqual(pending.has(id), false, "an expired action must not linger");
});

t("unknown pendingId is refused", () => {
  assert.strictEqual(takePending("made-up-id"), null);
  assert.strictEqual(takePending(""), null);
});

// ---- the wire contract with jarvis/listener.py ----
// This bug shipped twice in opposite directions: first the listener POSTed {id}
// while the server read `pendingId`, then the server replied with `pendingId`
// while the listener read only id/pending_id/confirm_id. Both times every gated
// command failed silently and only a human noticed. The key is a contract
// between two files in two languages, so test it as one.
const LISTENER_SRC = fs.readFileSync(path.join(__dirname, "..", "jarvis", "listener.py"), "utf8");

t("server announces a gated action under the key `pendingId`", () => {
  const src = fs.readFileSync(path.join(__dirname, "server.js"), "utf8");
  const block = src.slice(src.indexOf('type: "confirm_required"'));
  assert(block.slice(0, 200).includes("pendingId"), "confirm_required payload must carry pendingId");
});

t("listener READS the pendingId key the server sends", () => {
  assert(/resp\.get\(\s*["']pendingId["']\s*\)/.test(LISTENER_SRC),
    "listener.py must read resp.get('pendingId') — without it every gated command dies on the no-handle branch");
});

t("listener SENDS back the pendingId key the server reads", () => {
  assert(/["']pendingId["']\s*:/.test(LISTENER_SRC),
    "listener.py must POST {'pendingId': ...} to /voice-command/confirm");
});

t("the confirm window is long enough to survive TTS before the first spoken yes", () => {
  // The server's clock starts inside createPending, before the response is even
  // written; the listener only starts listening after the round trip, a cold
  // SAPI spawn and the spoken summary. Anything under ~30s expires mid-sentence.
  assert(PENDING_MS >= 30000, `PENDING_MS=${PENDING_MS} is too short for a spoken confirm round trip`);
});

t("ids are unguessable", () => {
  const a = createPending(gated, {}), b = createPending(gated, {});
  assert.notStrictEqual(a, b);
  assert(a.length >= 32, "pending ids should be uuids, not counters");
  takePending(a); takePending(b);
});

console.log(ok.map((n) => "  ok  " + n).join("\n"));
console.log(`\n${ok.length} checks passed — ${REGISTRY.filter((c) => c.type === "read_only").length} read_only + ${REGISTRY.filter((c) => c.type === "gated").length} gated commands.`);
